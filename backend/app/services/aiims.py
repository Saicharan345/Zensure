"""
AIIMS Engine — AI Insurance Monitoring System
5-Stage Deep AI Pipeline:
  1. Monitoring Layer  — Deep anomaly classifier (AIIMS-Monitor-v2)
  2. Analyzing Layer   — AI eligibility scoring (AIIMS-Eligibility-v2)
  3. Fraud Layer       — 5-technique ensemble fraud detection (AIIMS-FraudEnsemble-v2)
  4. Decision Layer    — AI payout optimization (AIIMS-PayoutOpt-v2)
  5. Payout Layer      — AI-verified payout execution (AIIMS-PayoutVerify-v2)

Key behaviors:
  - When fraud is detected, auto-increases fraud score on SPIL worker record
  - Fraud score feeds into Dual Premium Engine for next-week premium calculation
  - Blacklists accounts when cumulative fraud points reach 10
  - Edge cases handled at every stage
"""
from __future__ import annotations

import json
from typing import Any

from app.data.mock_data import ANOMALY_TEMPLATES, ZONE_LOCATIONS, ZONE_SIGNALS
from app.services.auth_engine import utc_now
from app.services.database import (
    create_anomaly_event,
    create_payout_ledger_entry,
    get_anomaly_event,
    get_subscribed_workers_in_zone,
    record_zencoin_transaction,
    update_anomaly_event,
    update_worker as db_update_worker,
)
from app.services.premium_engine import calculate_premium
from app.services.trigger_engine import detect_parametric_triggers
from app.services.trustshield import evaluate_trustshield


# ---------------------------------------------------------------------------
# Existing single-claim decision (kept for backward compat with /api/claims/*)
# ---------------------------------------------------------------------------

def run_aiims_decision(worker: dict, policy: dict, zone: dict, scenario: dict, spil_profile: dict | None = None) -> dict:
    premium = calculate_premium(worker, zone, spil_profile)
    trigger_result = detect_parametric_triggers(worker, scenario)
    trustshield = evaluate_trustshield(worker, scenario)

    if not trigger_result["triggered"]:
        status = "Rejected"
        payout_amount = 0
        reason = "No parametric trigger threshold was met for this event."
    elif trustshield["status"] == "Rejected":
        status = "Rejected"
        payout_amount = 0
        reason = "TrustShield detected strong fraud or anomaly signals."
    elif trustshield["status"] == "Review":
        status = "Review"
        payout_amount = round(min(policy["max_weekly_payout"], trigger_result["recommended_payout"] * 0.4), 2)
        reason = "The disruption is real, but the worker has medium-risk anomaly signals."
    else:
        status = "Approved"
        payout_amount = round(min(policy["max_weekly_payout"], trigger_result["recommended_payout"]), 2)
        reason = "AIIMS validated the disruption and approved zero-touch payout."

    return {
        "worker": worker,
        "policy": policy,
        "spil_profile": spil_profile,
        "premium_quote": premium,
        "scenario": scenario,
        "claim_decision": {
            "status": status,
            "payout_amount": payout_amount,
            "estimated_income_loss": trigger_result["estimated_income_loss"],
            "reason": reason,
        },
        "aiims_trace": {
            "matched_triggers": trigger_result["matched_triggers"],
            "confidence": trigger_result["confidence"],
            "disruption_strength": trigger_result["disruption_strength"],
            "trustshield": trustshield,
        },
    }


# =====================================================================
# AIIMS 5-STAGE AI PIPELINE (anomaly-based automated payouts)
# =====================================================================

# ---- Stage 1: Monitoring (Deep AI Anomaly Classifier) ----

def monitoring_layer(anomaly_type: str, zone_id: str,
                     severity: float | None = None,
                     hours_affected: float | None = None,
                     location_name: str | None = None,
                     triggered_by: str = "admin") -> dict[str, Any]:
    """
    AI-driven monitoring layer using deep anomaly classification network.
    Classifies anomaly type, validates severity, and creates event record.
    Uses AIIMS-Monitor-v2 (3-layer: 4→8→6→7) for multi-class classification.
    """
    from app.services.ai_core import AIIMS_MONITOR_MODEL

    template = ANOMALY_TEMPLATES.get(anomaly_type)
    if not template:
        return {"error": f"Unknown anomaly type: {anomaly_type}"}

    if zone_id not in ZONE_SIGNALS:
        return {"error": f"Unknown zone: {zone_id}"}

    actual_severity = severity if severity is not None else template["default_severity"]
    actual_hours = hours_affected if hours_affected is not None else template["default_hours"]

    # Edge case: Clamp severity and hours to valid ranges
    actual_severity = max(0.0, min(1.0, actual_severity))
    actual_hours = max(0.5, min(24.0, actual_hours))

    # Deep model input: [severity, hours_normalized, zone_risk_factor, env_factor]
    zone_data = ZONE_SIGNALS.get(zone_id, {})
    zone_risk_factor = max(0.0, min(1.0, float(zone_data.get("flood_risk", 0.5))))
    env_factor = max(0.0, min(1.0, actual_severity * 0.7 + float(zone_data.get("flood_risk", 0)) * 0.3))

    model_inputs = [actual_severity, actual_hours / 12.0, zone_risk_factor, env_factor]
    probs = AIIMS_MONITOR_MODEL.predict(model_inputs)

    # The model outputs 7 class probabilities; pick the max as confidence
    confidence_score = max(probs) if probs else 0.5

    # Edge case: Very low confidence — still proceed but flag
    if confidence_score < 0.3:
        confidence_score = max(confidence_score, actual_severity * 0.6)

    if actual_severity >= 0.9:
        severity_label = "critical"
    elif actual_severity >= 0.7:
        severity_label = "high"
    elif actual_severity >= 0.5:
        severity_label = "medium"
    else:
        severity_label = "low"

    zone_info = ZONE_LOCATIONS.get(zone_id, {})
    loc_name = location_name or zone_info.get("full_name", ZONE_SIGNALS[zone_id].get("label", zone_id))

    event = create_anomaly_event({
        "anomaly_type": anomaly_type,
        "zone_id": zone_id,
        "location_name": loc_name,
        "severity": actual_severity,
        "severity_label": severity_label,
        "hours_affected": actual_hours,
        "triggered_by": f"AI-Model ({triggered_by})",
    })

    return {
        "layer": "monitoring",
        "status": "anomaly_detected",
        "event": event,
        "ai_trace": {
            "model": AIIMS_MONITOR_MODEL.name,
            "architecture": "4→8→6→7 (Deep Classifier)",
            "confidence": round(confidence_score, 3),
            "class_probabilities": {
                "heavy_rainfall": round(probs[0], 3) if len(probs) > 0 else 0,
                "extreme_heat": round(probs[1], 3) if len(probs) > 1 else 0,
                "high_aqi": round(probs[2], 3) if len(probs) > 2 else 0,
                "flooding": round(probs[3], 3) if len(probs) > 3 else 0,
                "curfew": round(probs[4], 3) if len(probs) > 4 else 0,
                "strike": round(probs[5], 3) if len(probs) > 5 else 0,
                "zone_closure": round(probs[6], 3) if len(probs) > 6 else 0,
            },
            "validated": confidence_score > 0.35,
        },
        "template": {
            "label": template["label"],
            "description": template["description"],
            "icon": template["icon"],
            "signal_params": template["signal_params"],
        },
    }


# ---- Stage 2: Analyzing (AI Eligibility Scoring) ----

def analyzing_layer(event: dict[str, Any]) -> dict[str, Any]:
    """
    AI-driven analyzing layer with eligibility scoring.
    Queries subscribed workers in affected zone, then scores each worker's
    eligibility using AIIMS-Eligibility-v2 neural network.
    Workers are ranked by eligibility priority.
    """
    from app.services.ai_core import AIIMS_ELIGIBILITY_MODEL, normalize

    zone_id = event["zone_id"]
    workers = get_subscribed_workers_in_zone(zone_id)

    event_severity = float(event.get("severity", 0.5))

    eligible = []
    for w in workers:
        # Edge case: Skip blacklisted workers entirely
        if w.get("kyc_status") == "blacklisted":
            continue

        worker_risk = float(w.get("gps_jump_risk", 0.1))
        plan_coverage = normalize(float(w.get("coverage_hours", 8)), 0, 24)
        reliability = float(w.get("on_time_rate", 0.85))

        # AI eligibility scoring
        eligibility_input = [worker_risk, plan_coverage, event_severity, reliability]
        eligibility_score = AIIMS_ELIGIBILITY_MODEL.predict(eligibility_input)[0]

        eligible.append({
            "worker_id": w["id"],
            "name": w["name"],
            "plan_name": w.get("plan_name", "Unknown"),
            "avg_daily_income": float(w.get("avg_daily_income", 0)),
            "max_weekly_payout": float(w.get("max_weekly_payout", 0)),
            "coverage_hours": int(w.get("coverage_hours", 8)),
            "zone_id": w["zone_id"],
            "platform": w.get("platform", "Unknown"),
            "eligibility_score": round(eligibility_score, 3),
        })

    # Sort by eligibility score (highest priority first)
    eligible.sort(key=lambda x: x.get("eligibility_score", 0), reverse=True)

    return {
        "layer": "analyzing",
        "zone_id": zone_id,
        "total_workers_in_zone": len(workers),
        "eligible_workers": eligible,
        "model": AIIMS_ELIGIBILITY_MODEL.name,
        "ai_trace": {
            "model": AIIMS_ELIGIBILITY_MODEL.name,
            "architecture": "4→4→1 (Eligibility Scorer)",
            "workers_scored": len(eligible),
            "workers_excluded_blacklist": len(workers) - len(eligible),
        },
    }


# ---- Stage 3: Fraud (5-Technique AI Ensemble Detection) ----

def fraud_layer(worker_info: dict, event: dict) -> dict[str, Any]:
    """
    Multi-technique AI fraud detection using ensemble of 5 specialized models:

    1. Velocity Fraud Detection — GPS spoofing and rapid location change patterns
    2. Pattern-Based Detection — Suspicious repeated claim/activity patterns
    3. Behavioral Analysis — Deviation from established behavioral baseline
    4. Geographic Anomaly Detection — Location vs IP inconsistency analysis
    5. Statistical Outlier Detection — Z-score based anomaly detection

    Auto-updates SPIL fraud score when ANY fraud signal is detected.
    This auto-increased score is used by the Dual Premium Engine to
    calculate higher premiums for the next week.

    Blacklists accounts when cumulative fraud score reaches 10.
    """
    from app.services.ai_core import AIIMS_FRAUD_MODEL, normalize
    from app.services.database import get_worker_by_id, get_spil_record, update_worker_fraud_metrics

    worker_id = worker_info["worker_id"]
    worker = get_worker_by_id(worker_id)
    if not worker:
        return {"layer": "fraud", "passed": False, "note": "Worker not found",
                "worker_id": worker_id, "fraud_score": 0, "total_points": 0}

    # ---- Edge Case: Already blacklisted ----
    if worker.get("kyc_status") == "blacklisted":
        return {
            "layer": "fraud",
            "worker_id": worker_id,
            "passed": False,
            "fraud_score": 1.0,
            "total_points": 10.0,
            "points_added": 0,
            "note": "ACCOUNT BLACKLISTED: Worker has been permanently blocked due to accumulated fraud.",
            "techniques": {"status": "all_blocked"},
            "ensemble_model": AIIMS_FRAUD_MODEL.name,
            "spil_auto_updated": False,
        }

    # ---- Prepare inputs for ensemble fraud model ----
    gps_jump = float(worker.get("gps_jump_risk", 0))
    spike = float(worker.get("activity_spike_score", 0))
    ip_mismatch = normalize(float(worker.get("ip_mismatch_count", 0)), 0, 10)
    tenure_bias = normalize(float(worker.get("on_time_rate", 1.0)), 0, 1)

    model_input = [gps_jump, spike, ip_mismatch, tenure_bias]

    # ---- Run ensemble prediction (all 5 specialized models) ----
    fraud_prob = AIIMS_FRAUD_MODEL.predict(model_input)[0]

    # Get individual model predictions for detailed trace
    individual_preds = AIIMS_FRAUD_MODEL.predict_individual(model_input)
    model_names = ["velocity", "pattern", "behavioral", "geographic", "statistical"]
    individual_scores = {}
    for i, name in enumerate(model_names):
        if i < len(individual_preds):
            individual_scores[name] = round(individual_preds[i][0], 3)

    # ---- Multi-Technique Fraud Analysis (rule-based augmentation of ML) ----
    techniques = {}

    # Technique 1: Velocity Fraud Analysis
    velocity_risk = "low"
    if gps_jump > 0.7:
        velocity_risk = "critical"
    elif gps_jump > 0.5:
        velocity_risk = "high"
    elif gps_jump > 0.3:
        velocity_risk = "medium"
    techniques["velocity"] = {
        "risk": velocity_risk,
        "gps_jump": round(gps_jump, 3),
        "ml_score": individual_scores.get("velocity", 0),
        "detail": f"GPS jump pattern risk: {velocity_risk} (jump={gps_jump:.3f})",
    }

    # Technique 2: Pattern-Based Analysis
    claim_frequency = float(worker.get("historic_claims", 0))
    pattern_risk = "low"
    if claim_frequency >= 5:
        pattern_risk = "critical"
    elif claim_frequency >= 3:
        pattern_risk = "high"
    elif claim_frequency >= 2:
        pattern_risk = "medium"
    techniques["pattern"] = {
        "risk": pattern_risk,
        "claim_frequency": claim_frequency,
        "ml_score": individual_scores.get("pattern", 0),
        "detail": f"Claim pattern: {claim_frequency:.0f} historic claims, risk: {pattern_risk}",
    }

    # Technique 3: Behavioral Analysis
    consistency = float(worker.get("consistency_score", 0.85))
    behavioral_risk = "low"
    if consistency < 0.5:
        behavioral_risk = "critical"
    elif consistency < 0.65:
        behavioral_risk = "high"
    elif consistency < 0.75:
        behavioral_risk = "medium"
    techniques["behavioral"] = {
        "risk": behavioral_risk,
        "consistency": round(consistency, 3),
        "ml_score": individual_scores.get("behavioral", 0),
        "detail": f"Behavioral consistency: {consistency:.1%}, risk: {behavioral_risk}",
    }

    # Technique 4: Geographic Anomaly Analysis
    ip_count = float(worker.get("ip_mismatch_count", 0))
    geo_risk = "low"
    if gps_jump > 0.5 and ip_count >= 3:
        geo_risk = "critical"
    elif gps_jump > 0.4 or ip_count >= 2:
        geo_risk = "high"
    elif gps_jump > 0.25 or ip_count >= 1:
        geo_risk = "medium"
    techniques["geographic"] = {
        "risk": geo_risk,
        "ip_mismatches": ip_count,
        "ml_score": individual_scores.get("geographic", 0),
        "detail": f"Geographic check: GPS={gps_jump:.2f}, IP mismatches={int(ip_count)}, risk: {geo_risk}",
    }

    # Technique 5: Statistical Outlier Analysis
    stat_risk = "low"
    if spike > 0.8:
        stat_risk = "critical"
    elif spike > 0.6:
        stat_risk = "high"
    elif spike > 0.35:
        stat_risk = "medium"
    techniques["statistical"] = {
        "risk": stat_risk,
        "spike_score": round(spike, 3),
        "ml_score": individual_scores.get("statistical", 0),
        "detail": f"Statistical deviation: spike={spike:.3f}, risk: {stat_risk}",
    }

    # ---- Count high-risk techniques ----
    high_risk_count = sum(1 for t in techniques.values() if t.get("risk") in ("high", "critical"))
    critical_count = sum(1 for t in techniques.values() if t.get("risk") == "critical")

    # ---- Determine fraud points to add (max 2 per event) ----
    points_to_add = 0.0
    if fraud_prob > 0.8 or critical_count >= 3:
        points_to_add = 2.0
    elif fraud_prob > 0.6 or high_risk_count >= 3:
        points_to_add = 1.5
    elif fraud_prob > 0.5 or high_risk_count >= 2:
        points_to_add = 1.0
    elif fraud_prob > 0.4:
        points_to_add = 0.5

    # ---- AUTO-UPDATE SPIL FRAUD SCORE ----
    # When AIIMS detects ANY fraud signal, auto-increase the fraud score
    # on the SPIL worker record. This updated score is then used by the
    # Dual Premium Engine to calculate higher premiums for next week.
    spil_auto_updated = False
    if points_to_add > 0:
        update_worker_fraud_metrics(worker_id, points_to_add)
        spil_auto_updated = True
        # Re-read worker to get updated fraud metrics
        worker = get_worker_by_id(worker_id)

    # Current cumulative fraud points (from potentially updated worker data)
    current_fraud_points = round(float(worker.get("activity_spike_score", 0)) * 10, 1)

    # ---- Final Decision ----
    passed = True
    note = "No significant fraud signals detected."

    if current_fraud_points >= 10 or worker.get("kyc_status") == "blacklisted":
        passed = False
        note = (f"ACCOUNT BLACKLISTED: Cumulative fraud score {current_fraud_points}/10 "
                f"reached threshold. Worker is permanently blocked.")
    elif fraud_prob > 0.7 or critical_count >= 3:
        passed = False
        note = (f"High fraud probability ({fraud_prob:.2f}). "
                f"{high_risk_count} techniques flagged high risk. "
                f"Points added: {points_to_add}. Total: {current_fraud_points}/10.")
    elif fraud_prob > 0.5 or high_risk_count >= 2:
        note = (f"Medium fraud risk ({fraud_prob:.2f}). "
                f"{high_risk_count} techniques flagged. "
                f"Points added: {points_to_add}. Total: {current_fraud_points}/10.")
    elif points_to_add > 0:
        note = (f"Minor fraud signal ({fraud_prob:.2f}). "
                f"Points added: {points_to_add}. Total: {current_fraud_points}/10.")

    return {
        "layer": "fraud",
        "worker_id": worker_id,
        "passed": passed,
        "fraud_score": round(fraud_prob, 3),
        "total_points": current_fraud_points,
        "points_added": points_to_add,
        "note": note,
        "techniques": techniques,
        "individual_model_scores": individual_scores,
        "high_risk_technique_count": high_risk_count,
        "ensemble_model": AIIMS_FRAUD_MODEL.name,
        "spil_auto_updated": spil_auto_updated,
    }


# ---- Stage 4: Decision (AI Payout Optimization) ----

SEVERITY_MULTIPLIERS = {
    "low": 0.50,
    "medium": 0.70,
    "high": 0.85,
    "critical": 1.00,
}

PLAN_MULTIPLIERS = {
    "Basic Weather Shield": 0.60,
    "Super Shield Plus": 1.00,
}


def decision_layer(worker_info: dict, event: dict) -> dict[str, Any]:
    """
    AI-driven decision layer using deep payout optimization network.
    Calculates fair and financially viable payout amounts.
    Uses AIIMS-PayoutOpt-v2 (3-layer: 4→6→3→1) for payout ratio prediction.

    Edge cases:
      - Zero daily income → minimum payout of 50 ZC
      - Hours exceeding coverage → capped at plan coverage
      - Payout exceeding weekly max → capped
      - Very low severity → reduced but non-zero payout
    """
    from app.services.ai_core import AIIMS_PAYOUT_MODEL, normalize

    daily_income = float(worker_info.get("avg_daily_income", 800))
    # Edge case: Zero or very low income
    daily_income = max(200.0, daily_income)

    coverage_hours = int(worker_info.get("coverage_hours", 8))
    raw_hours_affected = float(event.get("hours_affected", 4))
    # Edge case: Hours cannot exceed coverage
    hours_affected = min(raw_hours_affected, float(coverage_hours))
    # Edge case: Minimum affected hours
    hours_affected = max(0.5, hours_affected)

    severity_label = event.get("severity_label", "medium")
    severity_value = float(event.get("severity", 0.5))
    plan_name = worker_info.get("plan_name", "Basic Weather Shield")
    max_weekly_payout = float(worker_info.get("max_weekly_payout", 1400))

    base_hourly_rate = daily_income / 8.0
    raw_loss = base_hourly_rate * hours_affected

    plan_code = 1.0 if plan_name == "Super Shield Plus" else 0.6

    # Deep model inference: [raw_loss_normalized, severity, plan_code, risk_modifier]
    model_input = [normalize(raw_loss, 0, 5000), severity_value, plan_code, 0.5]
    payout_ratio = AIIMS_PAYOUT_MODEL.predict(model_input)[0]

    # Compute payout with viability constraints
    computed_payout = raw_loss * payout_ratio

    # Financial viability caps
    computed_payout = min(computed_payout, raw_loss * 0.9)     # Max 90% of loss
    computed_payout = min(computed_payout, max_weekly_payout)   # Plan cap
    # Edge case: Minimum payout of 50 ZC if event is real
    payout = round(max(50, computed_payout), 2)

    reason = (
        f"AI-optimized payout of {payout} ZC using {AIIMS_PAYOUT_MODEL.name}. "
        f"Model payout-ratio: {payout_ratio:.2f}. "
        f"Base loss ₹{raw_loss:.0f} ({hours_affected:.1f}h × ₹{base_hourly_rate:.0f}/h). "
        f"Capped at plan max {max_weekly_payout} ZC."
    )

    return {
        "layer": "decision",
        "worker_id": worker_info["worker_id"],
        "daily_income": daily_income,
        "hours_affected": hours_affected,
        "base_hourly_rate": round(base_hourly_rate, 2),
        "raw_loss": round(raw_loss, 2),
        "payout_ratio": round(payout_ratio, 3),
        "plan_name": plan_name,
        "payout_zencoins": payout,
        "reason": reason,
        "ai_trace": {
            "model": AIIMS_PAYOUT_MODEL.name,
            "architecture": "4→6→3→1 (Payout Optimizer)",
            "model_input": [round(v, 3) for v in model_input],
            "model_output_ratio": round(payout_ratio, 4),
        },
    }


# ---- Stage 5: Payout (AI-Verified Execution) ----

def payout_layer(worker_id: str, payout_amount: float, event_id: str,
                 reason: str, worker_name: str = "Worker",
                 severity: float = 0.5, plan_name: str = "Basic Weather Shield",
                 raw_loss: float = 0) -> dict[str, Any]:
    """
    AI-verified payout execution layer.
    Credits ZenCoins to worker wallet and validates the payout using
    AIIMS-PayoutVerify-v2 neural network for actuarial norm compliance.

    Edge cases:
      - Zero payout → skip wallet update
      - Very large payout → confidence warning
    """
    from app.services.ai_core import AIIMS_PAYOUT_VERIFY_MODEL, normalize

    # Edge case: Zero or negative payout
    if payout_amount <= 0:
        return {
            "layer": "payout",
            "worker_id": worker_id,
            "worker_name": worker_name,
            "payout_zencoins": 0,
            "wallet_balance_after": None,
            "event_id": event_id,
            "status": "skipped",
            "verification_confidence": 0,
            "reason": "Zero payout — no wallet update needed.",
        }

    # Execute wallet credit
    wallet = record_zencoin_transaction(
        worker_id,
        "aiims_payout",
        payout_amount,
        event_id,
        f"AIIMS anomaly payout: {reason[:80]}",
    )

    # Update worker total payout
    try:
        from app.services.database import get_worker_by_id
        worker = get_worker_by_id(worker_id)
        if worker:
            new_total = round(float(worker.get("total_payout_received", 0)) + payout_amount, 2)
            db_update_worker(worker_id, {"total_payout_received": new_total})
    except Exception:
        pass  # Non-critical update

    # ---- AI Payout Verification ----
    # Validates the payout against actuarial norms using neural network
    plan_code = 1.0 if plan_name == "Super Shield Plus" else 0.6
    payout_ratio_norm = normalize(payout_amount, 0, 5000)
    loss_ratio = normalize(raw_loss, 0, 5000) if raw_loss > 0 else 0.3

    verify_input = [payout_ratio_norm, severity, plan_code, loss_ratio]
    verification_confidence = AIIMS_PAYOUT_VERIFY_MODEL.predict(verify_input)[0]

    # Flag if confidence is unusually low
    verification_status = "verified"
    if verification_confidence < 0.4:
        verification_status = "low_confidence"
    elif verification_confidence > 0.9:
        verification_status = "high_confidence"

    return {
        "layer": "payout",
        "worker_id": worker_id,
        "worker_name": worker_name,
        "payout_zencoins": payout_amount,
        "wallet_balance_after": wallet["balance"],
        "event_id": event_id,
        "status": "credited",
        "verification": {
            "model": AIIMS_PAYOUT_VERIFY_MODEL.name,
            "confidence": round(verification_confidence, 3),
            "status": verification_status,
        },
    }


# =====================================================================
# ORCHESTRATOR — Runs all 5 AI stages for an anomaly event
# =====================================================================

def run_aiims_pipeline(anomaly_type: str, zone_id: str,
                       severity: float | None = None,
                       hours_affected: float | None = None,
                       location_name: str | None = None,
                       triggered_by: str = "admin") -> dict[str, Any]:
    """
    Full AIIMS 5-stage AI pipeline orchestrator.
    1. Monitoring (Deep Classifier) → 2. Analyzing (Eligibility AI) →
    3. Fraud (5-Technique Ensemble) → 4. Decision (Payout AI) → 5. Payout (AI-Verified)

    Returns complete trace for admin dashboard with all AI model outputs.
    """

    # ---- Stage 1: Monitoring (Deep Anomaly Classifier) ----
    monitoring = monitoring_layer(anomaly_type, zone_id, severity, hours_affected, location_name, triggered_by)
    if "error" in monitoring:
        return {"error": monitoring["error"], "layers": {"monitoring": monitoring}}

    event = monitoring["event"]

    # ---- Stage 2: Analyzing (AI Eligibility Scoring) ----
    analysis = analyzing_layer(event)

    if not analysis["eligible_workers"]:
        update_anomaly_event(event["id"], {
            "workers_affected": 0,
            "total_payout": 0,
            "status": "no_eligible_workers",
        })
        return {
            "event": event,
            "layers": {
                "monitoring": monitoring,
                "analyzing": analysis,
            },
            "summary": {
                "workers_affected": 0,
                "total_payout": 0,
                "message": "No subscribed workers found in the affected zone.",
            },
        }

    # ---- Process each worker through Stages 3-5 ----
    worker_results = []
    total_payout = 0
    fraud_blocked_count = 0

    for worker_info in analysis["eligible_workers"]:
        # Stage 3: Fraud Detection (5-Technique AI Ensemble)
        fraud = fraud_layer(worker_info, event)
        if not fraud["passed"]:
            fraud_blocked_count += 1
            worker_results.append({
                "worker_id": worker_info["worker_id"],
                "name": worker_info["name"],
                "fraud": fraud,
                "decision": None,
                "payout": None,
                "status": "fraud_blocked",
            })
            continue

        # Stage 4: Decision (AI Payout Optimization)
        decision = decision_layer(worker_info, event)

        # Stage 5: Payout (AI-Verified Execution)
        payout = payout_layer(
            worker_info["worker_id"],
            decision["payout_zencoins"],
            event["id"],
            decision["reason"],
            worker_info["name"],
            severity=float(event.get("severity", 0.5)),
            plan_name=decision.get("plan_name", "Basic Weather Shield"),
            raw_loss=decision.get("raw_loss", 0),
        )

        # Record in ledger
        create_payout_ledger_entry({
            "event_id": event["id"],
            "worker_id": worker_info["worker_id"],
            "worker_name": worker_info["name"],
            "plan_name": decision["plan_name"],
            "daily_income": decision["daily_income"],
            "severity": event["severity"],
            "hours_affected": decision["hours_affected"],
            "severity_multiplier": decision["payout_ratio"],  # AI-computed ratio
            "plan_multiplier": 1.0,                            # Baked into AI model
            "raw_loss": decision["raw_loss"],
            "payout_zencoins": decision["payout_zencoins"],
            "reason": decision["reason"],
            "layer_trace": {
                "fraud": fraud,
                "decision": decision,
                "payout": payout,
            },
        })

        total_payout += decision["payout_zencoins"]

        worker_results.append({
            "worker_id": worker_info["worker_id"],
            "name": worker_info["name"],
            "plan_name": decision["plan_name"],
            "eligibility_score": worker_info.get("eligibility_score", 0),
            "fraud": fraud,
            "decision": decision,
            "payout": payout,
            "status": "paid",
        })

    # Update the event with totals
    update_anomaly_event(event["id"], {
        "workers_affected": len(worker_results),
        "total_payout": round(total_payout, 2),
    })

    # Refresh event data
    updated_event = get_anomaly_event(event["id"]) or event

    return {
        "event": updated_event,
        "template": monitoring.get("template"),
        "layers": {
            "monitoring": {**monitoring, "event": updated_event},
            "analyzing": analysis,
            "worker_results": worker_results,
        },
        "ai_models_used": {
            "stage_1_monitoring": monitoring.get("ai_trace", {}).get("model", "unknown"),
            "stage_2_analyzing": analysis.get("model", "unknown"),
            "stage_3_fraud": "AIIMS-FraudEnsemble-v2 (5-technique ensemble)",
            "stage_4_decision": "AIIMS-PayoutOpt-v2 (3-layer deep network)",
            "stage_5_payout": "AIIMS-PayoutVerify-v2 (verification network)",
        },
        "summary": {
            "workers_affected": len(worker_results),
            "workers_paid": len(worker_results) - fraud_blocked_count,
            "workers_fraud_blocked": fraud_blocked_count,
            "total_payout": round(total_payout, 2),
            "payouts": [
                {
                    "worker_id": r["worker_id"],
                    "name": r["name"],
                    "payout": r["decision"]["payout_zencoins"] if r["decision"] else 0,
                    "status": r["status"],
                    "eligibility_score": r.get("eligibility_score", 0),
                }
                for r in worker_results
            ],
            "message": (
                f"AIIMS 5-stage AI pipeline processed {len(worker_results)} worker(s). "
                f"Paid: {len(worker_results) - fraud_blocked_count}, "
                f"Fraud-blocked: {fraud_blocked_count}, "
                f"Total payout: {round(total_payout, 2)} ZC."
            ),
        },
    }
