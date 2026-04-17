def evaluate_trustshield(worker: dict, scenario: dict, live_signals: dict | None = None) -> dict:
    """
    Enhanced TrustShield Fraud Detection Layer.
    Corroborates claims against real-time signals and worker behavioral baseline.
    """
    fraud_score = 0
    reasons = []

    # 1. Geographic Anomaly (GPS Spoofing / Jump)
    if worker.get("gps_jump_risk", 0) > 0.55:
        fraud_score += 40
        reasons.append("GPS jump pattern is unusually high (possible spoofing)")

    # 2. Network Anomaly (IP Mismatch)
    if int(worker.get("ip_mismatch_count", 0)) >= 2:
        fraud_score += 25
        reasons.append(f"Repeated IP mismatches detected ({worker['ip_mismatch_count']} events)")

    # 3. Behavioral Anomaly (Activity Spikes)
    if worker.get("activity_spike_score", 0) > 0.65:
        fraud_score += 20
        reasons.append("Abnormal activity spike versus historic baseline")

    # 4. History Anomaly (Claim Frequency)
    if int(worker.get("historic_claims", 0)) >= 4:
        fraud_score += 15
        reasons.append("High repeat-claim frequency detected")

    # 5. Environmental Corroboration (The "Real API" check)
    if live_signals:
        # If worker claims a weather scenario but live signals for their zone show NO disruption
        scenario_label = scenario.get("label", "").lower()
        if "rain" in scenario_label or "flood" in scenario_label:
            if live_signals.get("rainfall_mm", 0) < 1.0 and live_signals.get("flood_risk", 0) < 0.1:
                fraud_score += 50
                reasons.append("Claimed rain/flood disruption but live API reports clear weather")
        
        if "aqi" in scenario_label or "pollution" in scenario_label:
            if live_signals.get("aqi", 0) < 100:
                fraud_score += 40
                reasons.append(f"Claimed pollution surge but live AQI is healthy ({live_signals['aqi']})")

    # 6. Logic Anomaly (Claim Intensity vs Signal)
    if scenario.get("restriction_level", 0) == 0 and scenario.get("order_drop", 0) > 0.85:
        fraud_score += 15
        reasons.append("Claimed loss intensity is higher than environmental signal suggests")

    # Final Decision
    if fraud_score >= 70:
        status = "Rejected"
    elif fraud_score >= 35:
        status = "Review"
    else:
        status = "Approved"
        if not reasons:
            reasons.append("No meaningful anomaly found across TrustShield checks")

    return {
        "status": status,
        "fraud_score": min(fraud_score, 100),
        "reasons": reasons,
        "live_corroboration": bool(live_signals)
    }
