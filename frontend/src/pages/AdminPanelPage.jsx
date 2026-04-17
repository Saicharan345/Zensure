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
  Clock,
  Zap,
  Plus,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Edit2,
  Save,
  X,
  CreditCard,
  Trash2
} from 'lucide-react'

// --- Constants from other pages ---
const ANOMALY_ICONS = {
  heavy_rainfall: '🌧️',
  extreme_heat: '🔥',
  high_aqi: '😷',
  flooding: '🌊',
  curfew: '🚫',
  strike: '✊',
  zone_closure: '🚧',
}

const LOCATION_ZONES = [
  'Bangalore', 'Hyderabad', 'Chennai', 'Vijayawada', 'Vishakapatnam',
  'Delhi', 'Mumbai', 'Kolkata', 'Agra', 'Noida',
  'Pune', 'Pondicherry', 'Thirpur', 'Puri', 'Goa',
]

const ZONE_COORDS = {
  Bangalore: { lat: 12.9716, lon: 77.5946 },
  Hyderabad: { lat: 17.3850, lon: 78.4867 },
  Chennai: { lat: 13.0827, lon: 80.2707 },
  Vijayawada: { lat: 16.5062, lon: 80.6480 },
  Vishakapatnam: { lat: 17.6868, lon: 83.2185 },
  Delhi: { lat: 28.7041, lon: 77.1025 },
  Mumbai: { lat: 19.0760, lon: 72.8777 },
  Kolkata: { lat: 22.5726, lon: 88.3639 },
  Agra: { lat: 27.1767, lon: 78.0081 },
  Noida: { lat: 28.5355, lon: 77.3910 },
  Pune: { lat: 18.5204, lon: 73.8567 },
  Pondicherry: { lat: 11.9416, lon: 79.8083 },
  Thirpur: { lat: 11.1085, lon: 77.3411 },
  Puri: { lat: 19.7983, lon: 85.8249 },
  Goa: { lat: 15.2993, lon: 74.1240 },
}

const defaultSpilForm = {
  external_worker_id: '',
  name: '',
  employer_name: 'Partner Workforce Grid',
  platform: 'Swiggy',
  employment_type: 'Gig',
  shift_pattern: 'Peak-hour flexible',
  experience_years: 1,
  incident_count: 0,
  attendance_score: 0.9,
  reliability_score: 0.88,
  risk_band: 'Medium',
  notes: '',
  avg_working_hours_per_week: 40,
  rating: 4.5,
  location_name: 'Hyderabad',
  location_latitude: 17.385,
  location_longitude: 78.4867,
  location_risk_score: 0.5,
  salary_per_week: 6000,
  deliveries_per_week: 60,
  night_shift_percentage: 0.2,
  safety_behavior_score: 0.85,
  platform_tenure_years: 1.5,
  fraud_flag: false,
  insurance_claimed_count: 0,
}

export default function AdminPanelPage({ adminToken, apiUrl }) {
  const [activeTab, setActiveTab] = useState('workers')
  const [workers, setWorkers] = useState([])
  const [selectedWorkerId, setSelectedWorkerId] = useState(null)
  const [workerDetails, setWorkerDetails] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  // --- API Wrapper ---
  const apiRequest = useCallback(async (path, options = {}) => {
    const headers = { 
        ...(options.headers || {}),
        Authorization: `Bearer ${adminToken}`
    }
    const response = await fetch(`${apiUrl}${path}`, { ...options, headers })
    const data = await response.json()
    if (!response.ok) throw new Error(data.detail || data.message || 'API request failed')
    return data
  }, [adminToken, apiUrl])

  // --- Fetch Workers ---
  const fetchWorkers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiRequest('/api/admin/workers')
      setWorkers(data.workers || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiRequest])

  const fetchWorkerDetails = useCallback(async (id) => {
    setLoading(true)
    try {
      const data = await apiRequest(`/api/admin/workers/${id}`)
      setWorkerDetails(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [apiRequest])

  useEffect(() => {
    if (activeTab === 'workers') fetchWorkers()
  }, [activeTab, fetchWorkers])

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

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">ZENSURE Administrative Portal</h1>
          <p className="mt-2 text-slate-400">Isolated Management Environment for Platform Integrity.</p>
        </div>
        <div className="flex gap-2 p-1 bg-slate-900/50 rounded-xl border border-white/5">
           <TabButton active={activeTab === 'workers'} onClick={() => setActiveTab('workers')} icon={Users} label="Database" />
           <TabButton active={activeTab === 'spil'} onClick={() => setActiveTab('spil')} icon={Plus} label="SPIL Registry" />
           <TabButton active={activeTab === 'aiims'} onClick={() => setActiveTab('aiims')} icon={Zap} label="Anomaly Engine" />
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-emerald-200 flex justify-between items-center animate-in fade-in slide-in-from-top-2">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {activeTab === 'workers' && (
        selectedWorkerId ? (
            <WorkerDetailsView 
              data={workerDetails} 
              loading={loading} 
              onBack={() => setSelectedWorkerId(null)}
              apiRequest={apiRequest}
              refresh={() => fetchWorkerDetails(selectedWorkerId)}
              setSuccess={setSuccess}
              setError={setError}
            />
          ) : (
            <div className="space-y-6">
                <div className="flex justify-end gap-4">
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
                        Refresh
                    </button>
                </div>
                <WorkerListView workers={filteredWorkers} onSelect={(id) => setSelectedWorkerId(id)} />
            </div>
          )
      )}

      {activeTab === 'spil' && (
          <SpilRegistryView apiRequest={apiRequest} setSuccess={setSuccess} setError={setError} />
      )}

      {activeTab === 'aiims' && (
          <AiimsEngineView apiRequest={apiRequest} setSuccess={setSuccess} setError={setError} />
      )}
    </div>
  )
}

function TabButton({ active, onClick, icon: Icon, label }) {
    return (
        <button 
            onClick={onClick}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                active ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
        >
            <Icon className="h-4 w-4" />
            {label}
        </button>
    )
}

// --- WORKER COMPONENTS ---

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
          </tbody>
        </table>
      </div>
    </div>
  )
}

function WorkerDetailsView({ data, loading, onBack, apiRequest, refresh, setSuccess, setError }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [adjustingWallet, setAdjustingWallet] = useState(false)
  const [walletAmount, setWalletAmount] = useState('')
  const [walletReason, setWalletReason] = useState('Admin override')
  
  const [managingPolicy, setManagingPolicy] = useState(false)
  
  useEffect(() => {
    if (data?.worker) {
        setEditForm({
            name: data.worker.name,
            email: data.worker.email,
            phone: data.worker.phone,
            city: data.worker.city,
            platform: data.worker.platform,
            kyc_status: data.worker.kyc_status,
            avg_daily_income: data.worker.avg_daily_income,
            weekly_active_days: data.worker.weekly_active_days
        })
    }
  }, [data])

  if (loading || !data) {
    return (
      <div className="glass-card p-12 text-center text-slate-400">
        Loading comprehensive worker dossier...
      </div>
    )
  }

  const { worker, policy, claims, wallet, transactions, spil, aiims_snapshots } = data

  const handleUpdate = async () => {
      try {
          await apiRequest(`/api/admin/workers/${worker.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(editForm)
          })
          setSuccess('Worker updated successfully')
          setIsEditing(false)
          refresh()
      } catch (err) {
          setError(err.message)
      }
  }

  const handleAdjustWallet = async (amount) => {
      if (!amount) return;
      try {
          await apiRequest(`/api/admin/workers/${worker.id}/wallet/adjust`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: Number(amount), reason: walletReason })
          })
          setSuccess(`Wallet adjusted by ${amount} ZC`)
          setAdjustingWallet(false)
          setWalletAmount('')
          refresh()
      } catch (err) {
          setError(err.message)
      }
  }

  const handleManagePolicy = async (action) => {
      try {
          await apiRequest(`/api/admin/workers/${worker.id}/policy/manage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                  action,
                  plan_name: "Admin Special Protection",
                  coverage_hours: 14,
                  max_weekly_payout: 5000
              })
          })
          setSuccess(action === 'add' ? 'Policy activated' : 'Policy removed')
          setManagingPolicy(false)
          refresh()
      } catch (err) {
          setError(err.message)
      }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button 
            onClick={onBack}
            className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white transition"
        >
            <ArrowLeft className="h-4 w-4" /> Back to List
        </button>
        <div className="flex gap-2">
            <button 
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                    isEditing ? 'bg-slate-700 text-white' : 'bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500 hover:text-white'
                }`}
            >
                {isEditing ? <><X className="h-4 w-4" /> Cancel</> : <><Edit2 className="h-4 w-4" /> Edit Profile</>}
            </button>
        </div>
      </div>

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
             {isEditing ? (
                 <div className="space-y-3">
                    <EditField label="Name" value={editForm.name} onChange={v => setEditForm({...editForm, name: v})} />
                    <EditField label="Email" value={editForm.email} onChange={v => setEditForm({...editForm, email: v})} />
                    <EditField label="Phone" value={editForm.phone} onChange={v => setEditForm({...editForm, phone: v})} />
                    <EditField label="City" value={editForm.city} onChange={v => setEditForm({...editForm, city: v})} />
                    <EditField label="KYC Status" value={editForm.kyc_status} type="select" options={['pending', 'verified', 'blacklisted']} onChange={v => setEditForm({...editForm, kyc_status: v})} />
                    <EditField label="Daily Income" value={editForm.avg_daily_income} type="number" onChange={v => setEditForm({...editForm, avg_daily_income: Number(v)})} />
                    <button 
                        onClick={handleUpdate}
                        className="w-full flex items-center justify-center gap-2 mt-4 bg-cyan-500 text-white py-2 rounded-lg font-bold hover:bg-cyan-600 transition"
                    >
                        <Save className="h-4 w-4" /> Save Changes
                    </button>
                 </div>
             ) : (
                <>
                    <InfoRow label="Email" value={worker.email} />
                    <InfoRow label="Phone" value={worker.phone || 'N/A'} />
                    <InfoRow label="Location" value={`${worker.city} (${worker.zone_id})`} />
                    <InfoRow label="Connected Since" value={new Date(worker.connected_since).toLocaleDateString()} />
                    <InfoRow label="Avg Daily Income" value={`INR ${worker.avg_daily_income}`} />
                    <InfoRow label="KYC Status" value={worker.kyc_status} uppercase highlight={worker.kyc_status === 'verified'} />
                </>
             )}
          </div>
        </div>

        {/* Protection Card */}
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-cyan-400" /> Protection
            </h3>
            <button 
                onClick={() => setManagingPolicy(!managingPolicy)}
                className="text-xs text-cyan-400 hover:underline"
            >
                {policy ? 'Override' : 'Manual Add'}
            </button>
          </div>
          
          {managingPolicy ? (
              <div className="space-y-4 p-4 border border-white/10 rounded-xl bg-white/5 animate-in zoom-in-95">
                  <p className="text-xs text-slate-400">Forcefully add or remove insurance protection.</p>
                  <div className="flex gap-2">
                    <button 
                        onClick={() => handleManagePolicy('add')}
                        className="flex-1 bg-emerald-500/20 text-emerald-400 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500/30"
                    >
                        Activate Policy
                    </button>
                    {policy && (
                        <button 
                            onClick={() => handleManagePolicy('remove')}
                            className="flex-1 bg-rose-500/20 text-rose-400 py-2 rounded-lg text-sm font-bold hover:bg-rose-500/30"
                        >
                            Remove Policy
                        </button>
                    )}
                  </div>
                  <button onClick={() => setManagingPolicy(false)} className="w-full text-[10px] text-slate-500 uppercase font-bold">Cancel</button>
              </div>
          ) : policy ? (
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
           <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-emerald-400" /> ZenWallet
                </h3>
                <button 
                    onClick={() => setAdjustingWallet(!adjustingWallet)}
                    className="text-xs text-emerald-400 hover:underline"
                >
                    Adjust Balance
                </button>
           </div>

           {adjustingWallet ? (
               <div className="space-y-4 p-4 border border-white/10 rounded-xl bg-white/5 animate-in zoom-in-95">
                   <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold">Amount (Positive to add, Negative to remove)</label>
                       <input 
                        type="number" 
                        value={walletAmount}
                        onChange={e => setWalletAmount(e.target.value)}
                        placeholder="e.g. 500 or -200"
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-400"
                       />
                   </div>
                   <div className="space-y-2">
                       <label className="text-[10px] text-slate-500 uppercase font-bold">Reason</label>
                       <input 
                        type="text" 
                        value={walletReason}
                        onChange={e => setWalletReason(e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-400 text-xs"
                       />
                   </div>
                   <button 
                    onClick={() => handleAdjustWallet(walletAmount)}
                    className="w-full bg-emerald-500 text-white py-2 rounded-lg font-bold hover:bg-emerald-600 transition"
                   >
                       Apply Adjustment
                   </button>
                   <button onClick={() => setAdjustingWallet(false)} className="w-full text-[10px] text-slate-500 uppercase font-bold">Cancel</button>
               </div>
           ) : (
               <>
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
               </>
           )}
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
                  </tbody>
               </table>
            </div>
         </div>

         {/* Transactions Table */}
         <div className="glass-card overflow-hidden">
            <div className="px-6 py-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
               <h3 className="font-semibold text-white flex items-center gap-2">
                  <Clock className="h-4 w-4 text-emerald-400" /> Transaction Ledger
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
                  </tbody>
               </table>
            </div>
         </div>
      </div>
    </div>
  )
}

function SpilRegistryView({ apiRequest, setSuccess, setError }) {
    const [records, setRecords] = useState([])
    const [loading, setLoading] = useState(false)
    const [form, setForm] = useState(defaultSpilForm)
    const [creating, setCreating] = useState(false)

    const fetchRecords = useCallback(async () => {
        setLoading(true)
        try {
            const data = await apiRequest('/api/admin/spil-workers')
            setRecords(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [apiRequest])

    useEffect(() => { fetchRecords() }, [fetchRecords])

    const handleSubmit = async (e) => {
        e.preventDefault()
        setCreating(true)
        try {
            await apiRequest('/api/admin/spil-workers/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form)
            })
            setSuccess('SPIL record created successfully')
            setForm(defaultSpilForm)
            fetchRecords()
        } catch (err) {
            setError(err.message)
        } finally {
            setCreating(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                    <Plus className="h-5 w-5 text-cyan-400" /> Register New External Worker (SPIL)
                </h3>
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <EditField label="External ID" value={form.external_worker_id} onChange={v => setForm({...form, external_worker_id: v})} />
                    <EditField label="Name" value={form.name} onChange={v => setForm({...form, name: v})} />
                    <EditField label="Platform" value={form.platform} type="select" options={['Swiggy', 'Zomato', 'Zepto', 'Blinkit']} onChange={v => setForm({...form, platform: v})} />
                    <EditField label="Zone" value={form.location_name} type="select" options={LOCATION_ZONES} onChange={v => setForm({...form, location_name: v})} />
                    <EditField label="Weekly Salary" value={form.salary_per_week} type="number" onChange={v => setForm({...form, salary_per_week: Number(v)})} />
                    <EditField label="Reliability" value={form.reliability_score} type="number" onChange={v => setForm({...form, reliability_score: Number(v)})} />
                    <div className="md:col-span-3 flex justify-end">
                        <button 
                            type="submit"
                            disabled={creating}
                            className="bg-cyan-500 text-white px-8 py-2 rounded-xl font-bold hover:bg-cyan-600 transition disabled:bg-slate-700"
                        >
                            {creating ? 'Registering...' : 'Register Worker'}
                        </button>
                    </div>
                </form>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                    <h3 className="font-semibold text-white">External Worker Directory</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-900/40 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                                <th className="px-6 py-3">Worker</th>
                                <th className="px-6 py-3">External ID</th>
                                <th className="px-6 py-3">Platform</th>
                                <th className="px-6 py-3">Location</th>
                                <th className="px-6 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {records.map(r => (
                                <tr key={r.id} className="hover:bg-white/5 transition">
                                    <td className="px-6 py-4 font-medium text-white">{r.name}</td>
                                    <td className="px-6 py-4 text-slate-400 font-mono">{r.external_worker_id}</td>
                                    <td className="px-6 py-4 text-cyan-400">{r.platform}</td>
                                    <td className="px-6 py-4 text-slate-300">{r.location_name}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            r.status === 'connected' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                                        }`}>
                                            {r.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function AiimsEngineView({ apiRequest, setSuccess, setError }) {
    const [dashboard, setDashboard] = useState(null)
    const [loading, setLoading] = useState(false)
    const [triggerForm, setTriggerForm] = useState({
        type: 'heavy_rainfall',
        zone: 'hyderabad',
        severity: 0.7,
        hours: 4
    })
    const [triggering, setTriggering] = useState(false)

    const fetchDashboard = useCallback(async () => {
        setLoading(true)
        try {
            const data = await apiRequest('/api/admin/aiims/dashboard')
            setDashboard(data)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [apiRequest])

    useEffect(() => { fetchDashboard() }, [fetchDashboard])

    const handleTrigger = async () => {
        setTriggering(true)
        try {
            const res = await apiRequest('/api/admin/aiims/trigger-anomaly', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    anomaly_type: triggerForm.type,
                    zone_id: triggerForm.zone,
                    severity: triggerForm.severity,
                    hours_affected: triggerForm.hours
                })
            })
            setSuccess(`Pipeline result: ${res.summary.workers_affected} workers paid ${res.summary.total_payout} ZC`)
            fetchDashboard()
        } catch (err) {
            setError(err.message)
        } finally {
            setTriggering(false)
        }
    }

    if (!dashboard) return <div className="p-12 text-center text-slate-500 italic">Syncing with AIIMS Engine...</div>

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <StatCard icon={Zap} title="Anomaly Events" value={dashboard.total_events} accent="amber" />
                <StatCard icon={TrendingUp} title="Active Now" value={dashboard.active_events} accent="rose" />
                <StatCard icon={Users} title="Workers Impacted" value={dashboard.total_workers_affected} accent="purple" />
                <StatCard icon={DollarSign} title="Total Payouts" value={`${dashboard.total_payout_zencoins} ZC`} accent="emerald" />
                <StatCard icon={Shield} title="AI Integrity" value="100%" accent="cyan" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-400" /> Trigger Manual Anomaly Event
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <EditField label="Anomaly Type" value={triggerForm.type} type="select" options={Object.keys(dashboard.anomaly_templates)} onChange={v => setTriggerForm({...triggerForm, type: v})} />
                            <EditField label="Zone" value={triggerForm.zone} type="select" options={Object.keys(dashboard.zone_locations)} onChange={v => setTriggerForm({...triggerForm, zone: v})} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <EditField label="Severity (0-1)" value={triggerForm.severity} type="number" onChange={v => setTriggerForm({...triggerForm, severity: Number(v)})} />
                            <EditField label="Hours Affected" value={triggerForm.hours} type="number" onChange={v => setTriggerForm({...triggerForm, hours: Number(v)})} />
                        </div>
                        <button 
                            onClick={handleTrigger}
                            disabled={triggering}
                            className="w-full bg-amber-500 text-white py-3 rounded-xl font-bold text-lg hover:bg-amber-600 transition disabled:bg-slate-700"
                        >
                            {triggering ? 'AIIMS Pipeline Running...' : 'Execute AIIMS Pipeline'}
                        </button>
                    </div>
                </div>

                <div className="glass-card overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-white/5 bg-white/5">
                        <h3 className="font-semibold text-white">Recent AIIMS Activity</h3>
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[400px]">
                        {dashboard.recent_events.map(event => (
                             <div key={event.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <span className="text-2xl">{ANOMALY_ICONS[event.anomaly_type]}</span>
                                    <div>
                                        <p className="font-medium text-white">{event.location_name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{event.anomaly_type.replace(/_/g, ' ')}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-bold text-emerald-400">+{event.total_payout} ZC</p>
                                    <p className="text-[10px] text-slate-500">{event.workers_affected} workers</p>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- SHARED UTILS ---

function EditField({ label, value, onChange, type = 'text', options = [] }) {
    return (
        <div className="space-y-1">
            <label className="text-[10px] text-slate-500 uppercase font-bold">{label}</label>
            {type === 'select' ? (
                <select 
                    value={value} 
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400 text-sm"
                >
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : (
                <input 
                    type={type}
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="w-full bg-slate-900 border border-white/10 rounded-lg px-3 py-2 text-white outline-none focus:border-cyan-400 text-sm"
                />
            )}
        </div>
    )
}

function RiskBadge({ label, score }) {
  const level = score > 0.7 ? 'rose' : score > 0.3 ? 'amber' : 'emerald'
  const colors = {
      rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
  }
  const barColors = {
      rose: 'bg-rose-400',
      amber: 'bg-amber-400',
      emerald: 'bg-emerald-400'
  }
  return (
    <div className="flex flex-col items-center">
      <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase transition border ${colors[level]}`}>
        {label}
      </div>
      <div className="mt-1 h-1 w-6 rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${barColors[level]}`} style={{ width: `${Math.round(score * 100)}%` }} />
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

function StatCard({ icon: Icon, title, value, accent = 'cyan' }) {
  const accentColors = {
    cyan: 'text-cyan-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
    purple: 'text-purple-400',
    rose: 'text-rose-400'
  }
  return (
    <div className="glass-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-slate-500 font-bold uppercase">{title}</p>
        <Icon className={`h-4 w-4 ${accentColors[accent] || 'text-cyan-400'}`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  )
}
