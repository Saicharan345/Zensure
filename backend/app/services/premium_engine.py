"""
Dual Premium Engine — ML-Driven Insurance Premium Calculation

Uses a deep neural network (PremiumRiskNet-v2) for worker risk scoring
instead of plain weighted rules. The model processes 10 normalized
features through 3 layers to produce a calibrated risk score.

Edge cases handled:
  - Blacklisted workers (fraud threshold exceeded)
  - Zero or very low income workers
  - Brand new workers with no history
  - Extreme fraud scores from SPIL auto-update
  - Missing SPIL data (graceful fallback)
"""


def _clamp(value: float, minimum: float = 0, maximum: float = 1) -> float:
    return max(minimum, min(maximum, value))


def _round_money(value: float) -> int:
    return int(round(value))


def _safe_div(numerator: float, denominator: float) -> float:
    if not denominator:
        return 0.0
    return numerator / denominator


def _build_plan(plan_id: str, label: str, actuarial_premium: float, worker_share_ratio: float, income: float, trigger_score: float) -> dict:
    worker_premium = min(_round_money(actuarial_premium * worker_share_ratio), 80)
    platform_subsidy = max(0, _round_money(actuarial_premium - worker_premium))

    if plan_id == "basic":
        payout_multiplier = 0.82
        minimum_payout = 900
        maximum_payout_cap = 2800
        coverage_hours = 8
        upgrade_rank = 1
        summary = "Entry plan for weather-led disruptions with lower weekly premium and focused payout limits."
        benefits = [
            "Rain, flood, and zone restriction disruption support.",
            "Lower weekly ZenCoin premium for first-time subscribers.",
            "Designed for workers who want affordable baseline protection.",
        ]
        exclusions = [
            "Lower payout cap than Super Shield Plus.",
            "Less aggressive trigger coverage for compound disruption events.",
        ]
    else:
        payout_multiplier = 1.08
        minimum_payout = 1400
        maximum_payout_cap = 4200
        coverage_hours = 12
        upgrade_rank = 2
        summary = "Highest protection tier with broader trigger handling and stronger payout ceilings."
        benefits = [
            "Higher payout cap for severe disruption weeks.",
            "Better response to compound weather, AQI, and restriction events.",
            "Best fit for workers depending on peak-hour income continuity.",
        ]
        exclusions = [
            "Higher weekly ZenCoin premium than Basic Weather Shield.",
        ]

    max_weekly_payout = _round_money(
        min(
            maximum_payout_cap,
            max(minimum_payout, income * payout_multiplier * (1 + 0.35 * trigger_score)),
        )
    )

    return {
        "plan_id": plan_id,
        "plan_name": label,
        "weekly_premium": worker_premium,
        "premium_zencoins": worker_premium,
        "platform_subsidy_inr": platform_subsidy,
        "coverage_hours": coverage_hours,
        "upgrade_rank": upgrade_rank,
        "max_weekly_payout": max_weekly_payout,
        "max_weekly_payout_zencoins": max_weekly_payout,
        "currency": "ZEN",
        "summary": summary,
        "benefits": benefits,
        "exclusions": exclusions,
        "claim_rules": [
            "Payouts are credited in ZenCoins after AIIMS claim evaluation.",
            "Live worker profile and linked SPIL data influence eligibility and pricing.",
            "An active subscription is required before claims can be processed.",
        ],
        "terms_confirmation": "I have read the plan benefits, payout limits, and exclusions.",
    }


def calculate_premium(worker: dict, zone: dict, spil_profile: dict | None = None) -> dict:
    """
    ML-driven premium calculation using the deep PremiumRiskNet-v2 model.

    Reads fraud score from both worker record and SPIL profile to incorporate
    auto-updates from AIIMS fraud detection into next-week premium pricing.
    """

    # ---- Edge Case: Blacklisted Worker ----
    # When AIIMS fraud detection blacklists a worker (fraud score >= 10),
    # they cannot purchase or renew insurance plans.
    if worker.get("kyc_status") == "blacklisted":
        return {
            "risk_level": "High",
            "risk_score": 100.0,
            "worker_risk_score": 1.0,
            "weekly_premium": 0,
            "weekly_premium_zencoins": 0,
            "recommended_plan_id": None,
            "recommended_plan_name": None,
            "max_weekly_payout": 0,
            "currency": "ZEN",
            "available_plans": [],
            "pricing_breakdown": {
                "note": "Account blacklisted by AIIMS fraud detection. No plans available.",
                "blacklisted": True,
            },
            "spil_context": {
                "linked": bool(spil_profile),
                "profile": spil_profile,
                "zencoin_rate_inr": 1,
            },
            "explanation": (
                "This account has been blacklisted by AIIMS fraud detection due to cumulative "
                "fraud score reaching the threshold of 10. Insurance coverage is permanently "
                "suspended until manual review by an administrator."
            ),
        }

    # ---- Extract features with edge-case fallbacks ----
    salary_per_week = float((spil_profile or {}).get("salary_per_week", max((worker.get("avg_daily_income") or 800) * max(worker.get("weekly_active_days", 6), 1), 1200)))
    # Edge case: Ensure minimum viable income for premium calculation
    salary_per_week = max(1200.0, salary_per_week)

    avg_hours = float((spil_profile or {}).get("avg_working_hours_per_week", max(worker.get("weekly_active_days", 6) * 7, 1)))
    # Edge case: Zero hours — use minimum
    avg_hours = max(1.0, avg_hours)

    rating = float((spil_profile or {}).get("rating", 4.5))
    location_risk_raw = float((spil_profile or {}).get("location_risk_score", worker.get("gps_jump_risk", 0.12)))
    deliveries_per_week = float((spil_profile or {}).get("deliveries_per_week", 60))
    night_shift_pct = float((spil_profile or {}).get("night_shift_percentage", 0.2))
    safety_score = float((spil_profile or {}).get("safety_behavior_score", max(worker.get("on_time_rate", 0.88) * 10, 0)))
    tenure_months = float((spil_profile or {}).get("platform_tenure_years", 1.5) * 12)

    # ---- Fraud Score Integration ----
    # This is where AIIMS auto-updates feed into premium pricing:
    # - activity_spike_score is incremented by AIIMS fraud_layer via update_worker_fraud_metrics
    # - fraud_flag is set on SPIL record when worker crosses fraud threshold
    # Both are read here to compute the combined fraud signal for premium calculation
    spil_fraud_flag = float((spil_profile or {}).get("fraud_flag", 0))
    worker_spike = float(worker.get("activity_spike_score", 0.05))
    fraud_score = spil_fraud_flag * 7 + worker_spike * 10

    claims_count = float((spil_profile or {}).get("insurance_claimed_count", worker.get("historic_claims", 0)))

    # ---- Zone risk signals ----
    weather_severity = float(zone.get("flood_risk", 0) * 10)
    aqi_severity = _clamp(_safe_div(float(zone.get("aqi", 0)), 300), 0, 1) * 10
    restriction_severity = _clamp(_safe_div(float(zone.get("restriction_level", 0)), 4), 0, 1) * 10

    # ---- Normalize features to [0, 1] for model input ----
    normalized = {
        "Hn": _clamp(_safe_div(avg_hours, 72)),
        "Rn": _clamp(_safe_div(5 - rating, 4)),
        "Ln": _clamp(location_risk_raw if location_risk_raw <= 1 else _safe_div(location_risk_raw, 10)),
        "Sn": _clamp(_safe_div(salary_per_week, 10000), 0, 2),
        "Dn": _clamp(_safe_div(deliveries_per_week, 250), 0, 2),
        "Nn": _clamp(night_shift_pct if night_shift_pct <= 1 else _safe_div(night_shift_pct, 100)),
        "Bn": _clamp(_safe_div(10 - min(safety_score, 10), 10)),
        "Tn": _clamp(_safe_div(1, 1 + tenure_months / 12)),
        "Fn": _clamp(_safe_div(fraud_score, 10)),
        "Cn": _clamp(_safe_div(claims_count, 5), 0, 2),
    }

    # ---- Deep Model Inference ----
    from app.services.ai_core import PREMIUM_MODEL

    features = [
        normalized["Hn"], normalized["Rn"], normalized["Ln"], normalized["Sn"],
        normalized["Dn"], normalized["Nn"], normalized["Bn"], normalized["Tn"],
        normalized["Fn"], normalized["Cn"]
    ]

    # Model inference for worker risk score (3-layer deep network)
    model_output = PREMIUM_MODEL.predict(features)
    worker_risk_score = _clamp(model_output[0])

    # ---- Edge Case: Very high fraud score from SPIL auto-update ----
    # If AIIMS has been incrementing the fraud score, apply additional risk loading
    if fraud_score >= 7:
        worker_risk_score = min(1.0, worker_risk_score * 1.3)
    elif fraud_score >= 5:
        worker_risk_score = min(1.0, worker_risk_score * 1.15)

    # ---- Trigger scores (zone-level environmental risk) ----
    trigger_basic = _clamp(weather_severity / 10)
    trigger_super = _clamp(0.5 * (weather_severity / 10) + 0.25 * (aqi_severity / 10) + 0.25 * (restriction_severity / 10))

    # ---- Actuarial Premium Formula ----
    basic_base = 20 + 35 * worker_risk_score + 45 * trigger_basic
    super_base = 35 + 45 * worker_risk_score + 65 * trigger_super

    basic_loaded = basic_base * 1.8
    super_loaded = super_base * 2.0

    income_adjustment = 1 + 0.15 * ((salary_per_week - 1200) / 1800)
    income_adjustment = max(0.8, min(income_adjustment, 1.25))

    basic_final = basic_loaded * income_adjustment
    super_final = super_loaded * income_adjustment

    # ---- Build Plans ----
    available_plans = [
        _build_plan("basic", "Basic Weather Shield", basic_final, 0.38, salary_per_week, trigger_basic),
        _build_plan("super", "Super Shield Plus", super_final, 0.32, salary_per_week, trigger_super),
    ]
    recommended_plan = available_plans[1] if trigger_super >= 0.45 or worker_risk_score >= 0.4 else available_plans[0]

    if worker_risk_score < 0.28:
        risk_level = "Low"
    elif worker_risk_score < 0.5:
        risk_level = "Medium"
    else:
        risk_level = "High"

    return {
        "risk_level": risk_level,
        "risk_score": round(worker_risk_score * 100, 1),
        "worker_risk_score": round(worker_risk_score, 3),
        "weekly_premium": recommended_plan["weekly_premium"],
        "weekly_premium_zencoins": recommended_plan["premium_zencoins"],
        "recommended_plan_id": recommended_plan["plan_id"],
        "recommended_plan_name": recommended_plan["plan_name"],
        "max_weekly_payout": recommended_plan["max_weekly_payout"],
        "currency": "ZEN",
        "available_plans": available_plans,
        "pricing_breakdown": {
            "normalized": {key: round(value, 3) for key, value in normalized.items()},
            "weather_score": round(weather_severity, 2),
            "aqi_score": round(aqi_severity, 2),
            "restriction_score": round(restriction_severity, 2),
            "trigger_basic": round(trigger_basic, 3),
            "trigger_super": round(trigger_super, 3),
            "basic_base": round(basic_base, 2),
            "super_base": round(super_base, 2),
            "basic_loaded": round(basic_loaded, 2),
            "super_loaded": round(super_loaded, 2),
            "income_adjustment": round(income_adjustment, 3),
            "basic_formula_premium": round(basic_final, 2),
            "super_formula_premium": round(super_final, 2),
            "model": PREMIUM_MODEL.name,
            "fraud_score_from_spil": round(fraud_score, 2),
        },
        "spil_context": {
            "linked": bool(spil_profile),
            "profile": spil_profile,
            "zencoin_rate_inr": 1,
        },
        "explanation": (
            f"Premiums are calculated using the {PREMIUM_MODEL.name} deep neural network "
            f"with worker risk score {worker_risk_score:.3f}, "
            f"weather trigger {trigger_basic:.2f}, super trigger {trigger_super:.2f}, "
            f"income adjustment {income_adjustment:.2f}, and fraud signal {fraud_score:.1f}/10. "
            f"The worker-facing contribution is subsidized so the highest weekly payment stays within 80 ZenCoins."
        ),
    }
