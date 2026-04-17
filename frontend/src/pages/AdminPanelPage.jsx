import { useCallback, useEffect, useState } from 'react'
import { 
  Users, 
  Search, 
  Shield, 
  Wallet, 
  ChevronRight, 
  Eye, 
  UserCheck, 
  UserMinus, 
  Activity,
  ArrowLeft,
  FileText,
  Clock
} from 'lucide-react'

export default function AdminPanelPage({ adminToken, apiUrl }) {
  const [workers, setWorkers] = useState([])
  const [selectedWorkerId, setSelectedWorkerId] = useState(null)
  const [workerDetails, setWorkerDetails] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [error, setError] = useState(null)

  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`${apiUrl}/api/admin/workers`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (!response.ok) throw new Error('Failed to fetch workers')
      const data = await response.json()
      setWorkers(data.workers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [adminToken, apiUrl])

  const fetchWorkerDetails = useCallback(async (id) => {
    setLoadingDetails(true)
    try {
      const response = await fetch(`${apiUrl}/api/admin/workers/${id}`, {
        headers: { Authorization: `Bearer ${adminToken}` }
      })
      if (!response.ok) throw new Error('Failed to fetch worker details')
      const data = await response.json()
      setWorkerDetails(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoadingDetails(false)
    }
  }, [adminToken, apiUrl])

  useEffect(() => {
    fetchWorkers()
  }, [fetchWorkers])

  useEffect(() => {
    if (selectedWorkerId) {
      fetchWorkerDetails(selectedWorkerId)
    } else {
      setWorkerDetails(null)
    }
  }, [selectedWorkerId, fetchWorkerDetails])

  const filteredWorkers = workers.filter(w => 
    w.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    w.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading && !workers.length) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-xl font-medium text-slate-400">Loading ZENSURE Database...</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Administrative Portal</h1>
          <p className="mt-2 text-slate-400">Manage protection workers and platform integrity.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input 
              type="text" 
              placeholder="Search workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64 rounded-xl border border-white/10 bg-slate-900/50 py-2 pl-10 pr-4 text-sm text-white outline-none focus:border-cyan-400/40"
            />
          </div>
          <button 
            onClick={fetchWorkers}
            className="rounded-xl border border-white/10 bg-slate-800/40 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700/50"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200">
          {error}
        </div>
      )}

      {selectedWorkerId ? (
        <WorkerDetailsView 
          data={workerDetails} 
          loading={loadingDetails} 
          onBack={() => setSelectedWorkerId(null)} 
        />
      ) : (
        <WorkerListView 
          workers={filteredWorkers} 
          onSelect={(id) => setSelectedWorkerId(id)} 
        />
      )}
    </div>
  )
}

function WorkerListView({ workers, onSelect }) {
  return (
    <div className="glass-card overflow-hidden">
      <div className="border-b border-white/5 bg-white/5 px-6 py-4">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <Users className="h-4 w-4 text-cyan-400" />
          Registered Workers ({workers.length})
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-slate-900/30 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-6 py-4">Worker</th>
              <th className="px-6 py-4">Zone / Platform</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Audit Risks</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {workers.map((worker) => (
              <tr key={worker.id} className="group transition hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="font-medium text-white">{worker.name}</div>
                  <div className="text-xs text-slate-500">{worker.email}</div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5">{worker.id}</div>
                </td>
                <td className="px-6 py-2">
                  <div className="text-sm text-white">{worker.city}</div>
                  <div className="text-xs text-cyan-400">{worker.platform}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold uppercase ${
                    worker.kyc_status === 'verified' ? 'bg-emerald-500/10 text-emerald-400' : 
                    worker.kyc_status === 'blacklisted' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'
                  }`}>
                    {worker.kyc_status === 'verified' ? <UserCheck className="h-3 w-3" /> : <UserMinus className="h-3 w-3" />}
                    {worker.kyc_status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <RiskBadge label="GPS" score={worker.gps_jump_risk} />
                    <RiskBadge label="IP" score={worker.ip_mismatch_count / 10} />
                    <RiskBadge label="AI" score={worker.activity_spike_score} />
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => onSelect(worker.id)}
                    className="rounded-lg bg-cyan-500/10 p-2 text-cyan-400 transition group-hover:bg-cyan-500 group-hover:text-white"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No worker accounts found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WorkerDetailsView({ data, loading, onBack }) {
  if (loading || !data) {
    return (
      <div className="glass-card p-12 text-center text-slate-400">
        Loading comprehensive worker dossier...
      </div>
    )
  }

  const { worker, policy, claims, wallet, transactions, spil, aiims_snapshots } = data

  return (
    <div className="space-y-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-400 to-indigo-500 p-0.5">
              <div className="h-full w-full rounded-2xl bg-slate-900 flex items-center justify-center text-2xl font-bold text-white uppercase">
                {worker.name[0]}
              </div>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{worker.name}</h2>
              <p className="text-sm text-slate-400">{worker.platform} Partner</p>
              <div className="mt-1 flex gap-2">
                 <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded uppercase font-mono">{worker.id}</span>
              </div>
            </div>
          </div>
          
          <div className="mt-6 space-y-4">
             <InfoRow label="Email" value={worker.email} />
             <InfoRow label="Location" value={`${worker.city} (${worker.zone_id})`} />
             <InfoRow label="Connected Since" value={new Date(worker.connected_since).toLocaleDateString()} />
             <InfoRow label="Avg Daily Income" value={`INR ${worker.avg_daily_income}`} />
             <InfoRow label="KYC Status" value={worker.kyc_status} uppercase highlight={worker.kyc_status === 'verified'} />
          </div>
        </div>

        {/* Protection Card */}
        <div className="glass-card p-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <Shield className="h-5 w-5 text-cyan-400" /> Current Protection
          </h3>
          {policy ? (
            <div className="space-y-4">
               <div className="rounded-xl border border-cyan-400/20 bg-cyan-500/5 p-4">
                  <p className="text-xs text-cyan-400 uppercase font-bold">Active Plan</p>
                  <p className="text-lg font-bold text-white">{policy.plan_name}</p>
               </div>
               <InfoRow label="Coverage" value={`${policy.coverage_hours} hours/day`} />
               <InfoRow label="Weekly Limit" value={`${policy.max_weekly_payout} ZC`} />
               <InfoRow label="Last Updated" value={new Date(policy.updated_at).toLocaleDateString()} />
            </div>
          ) : (
            <div className="rounded-xl border border-slate-700 bg-slate-800/30 p-8 text-center text-sm text-slate-500">
               No active insurance policy found.
            </div>
          )}
        </div>

        {/* Wallet Summary */}
        <div className="glass-card p-6">
           <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
            <Wallet className="h-5 w-5 text-emerald-400" /> ZenWallet Balance
          </h3>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="text-4xl font-bold text-white">{wallet?.balance || 0} <span className="text-xl text-slate-500">ZC</span></div>
            <p className="mt-2 text-sm text-slate-400">Current available funds</p>
          </div>
          <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-xs text-slate-500 uppercase">Historic Claims</p>
              <p className="text-lg font-bold text-white">{worker.historic_claims}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase">Payouts Recv</p>
              <p className="text-lg font-bold text-white">{worker.total_payout_received || 0} ZC</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         {/* Claims Table */}
         <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
               <h3 className="font-semibold text-white flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-400" /> Claims History
               </h3>
               <span className="text-xs text-slate-500">{claims.length} entries</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
               <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-white/5">
                     {claims.map(claim => (
                        <tr key={claim.id} className="hover:bg-white/5">
                           <td className="px-6 py-4">
                              <div className="font-medium text-white">{claim.title}</div>
                              <div className="text-[10px] text-slate-500">{new Date(claim.created_at).toLocaleDateString()}</div>
                           </td>
                           <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                               claim.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400' : 
                               claim.status === 'Rejected' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                             }`}>
                               {claim.status}
                             </span>
                           </td>
                           <td className="px-6 py-4 text-right font-medium text-white">
                              {claim.payout_amount} ZC
                           </td>
                        </tr>
                     ))}
                     {claims.length === 0 && (
                        <tr><td className="px-6 py-8 text-center text-slate-500">No claims filed yet.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Transactions Table */}
         <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
               <h3 className="font-semibold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" /> ZenCoin Transactions
               </h3>
               <span className="text-xs text-slate-500">{transactions.length} entries</span>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
               <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-white/5">
                     {transactions.map(tx => (
                        <tr key={tx.id} className="hover:bg-white/5">
                           <td className="px-6 py-3">
                              <div className="font-medium text-white capitalize">{tx.transaction_type.replace(/_/g, ' ')}</div>
                              <div className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleDateString()}</div>
                           </td>
                           <td className="px-6 py-3 text-xs text-slate-400">
                             {tx.reference}
                           </td>
                           <td className="px-6 py-3 text-right">
                              <div className={`font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {tx.amount > 0 ? '+' : ''}{tx.amount} ZC
                              </div>
                              <div className="text-[10px] text-slate-600">Bal: {tx.balance_after}</div>
                           </td>
                        </tr>
                     ))}
                     {transactions.length === 0 && (
                        <tr><td className="px-6 py-8 text-center text-slate-500">No wallet activity found.</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
         {/* SPIL Integration Mirror */}
         <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
               <Activity className="h-5 w-5 text-indigo-400" /> SPIL Integration Mirror
            </h3>
            {spil ? (
               <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                  <InfoRow label="External ID" value={spil.external_worker_id} />
                  <InfoRow label="Platform Tenure" value={`${spil.platform_tenure_years} years`} />
                  <InfoRow label="Experience" value={`${spil.experience_years} years`} />
                  <InfoRow label="Safety Score" value={`${Math.round(spil.safety_behavior_score * 100)}%`} />
                  <InfoRow label="Attendance" value={`${Math.round(spil.attendance_score * 100)}%`} />
                  <InfoRow label="Incident Count" value={spil.incident_count} />
                  <div className="col-span-2 pt-2">
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Sync Notes</p>
                    <p className="mt-1 text-xs text-slate-400 bg-black/20 p-2 rounded italic">{spil.notes}</p>
                  </div>
               </div>
            ) : (
               <div className="p-8 text-center text-slate-500 italic">No SPIL record linked.</div>
            )}
         </div>

         {/* AIIMS Snapshots */}
         <div className="glass-card p-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-6">
               <Shield className="h-5 w-5 text-orange-400" /> AIIMS Decision Dossier
            </h3>
            <div className="space-y-3">
               {aiims_snapshots.slice(0, 4).map(snap => (
                  <div key={snap.id} className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
                     <div className="flex justify-between items-center">
                        <p className="text-sm font-bold text-white">{snap.plan_name}</p>
                        <p className="text-xs text-slate-500">{new Date(snap.created_at).toLocaleDateString()}</p>
                     </div>
                     <p className="mt-1 text-xs text-slate-400">Snapshot on Premium Payment: <span className="text-orange-400">{snap.premium_amount} ZC</span></p>
                     <p className="text-[10px] text-slate-600 font-mono">IP Hash: {snap.ip_address}</p>
                  </div>
               ))}
               {aiims_snapshots.length === 0 && (
                  <p className="text-center py-8 text-slate-500">No AIIMS activity dossiers available.</p>
               )}
            </div>
         </div>
      </div>
    </div>
  )
}

function RiskBadge({ label, score }) {
  const level = score > 0.7 ? 'rose' : score > 0.3 ? 'amber' : 'emerald'
  return (
    <div className="flex flex-col items-center">
      <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition bg-${level}-500/10 text-${level}-400 border border-${level}-500/20`}>
        {label}
      </div>
      <div className="mt-1 h-1 w-6 rounded-full bg-slate-800">
        <div className={`h-full rounded-full bg-${level}-400`} style={{ width: `${Math.round(score * 100)}%` }} />
      </div>
    </div>
  )
}

function InfoRow({ label, value, uppercase = false, highlight = false }) {
  return (
    <div className="flex justify-between items-center py-1">
      <span className="text-xs text-slate-500 font-medium uppercase tracking-wider">{label}</span>
      <span className={`text-sm font-semibold ${uppercase ? 'uppercase' : ''} ${highlight ? 'text-cyan-400' : 'text-slate-200'}`}>
        {value}
      </span>
    </div>
  )
}
