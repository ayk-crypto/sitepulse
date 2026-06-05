import React from "react";
import { 
  Bell, LayoutDashboard, Globe, Users, FileText, Settings, Plus, 
  ChevronDown, Monitor, ShieldCheck, AlertTriangle, ShieldAlert, FileWarning,
  Info, Check, RefreshCw, X, FileSearch, Plug, Palette, Server, Activity, ArrowRight,
  MoreVertical, Clock
} from "lucide-react";

export function Dashboard() {
  return (
    <div className="flex h-screen bg-[#f8fafc] font-sans overflow-hidden" style={{ fontFamily: '"Plus Jakarta Sans", sans-serif' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
      `}} />
      
      {/* Sidebar */}
      <div className="w-[220px] bg-[#0f172a] text-white flex flex-col h-full flex-shrink-0">
        <div className="p-5 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Activity size={18} className="text-white" />
          </div>
          <div>
            <div className="font-bold text-white leading-tight">SitePulse</div>
            <div className="text-xs text-slate-400">Onset Media</div>
          </div>
        </div>

        <div className="flex-1 px-3 py-2 space-y-1">
          <a href="#" className="flex items-center gap-3 px-3 py-2 bg-[#2563eb] text-white rounded-md text-sm font-medium">
            <LayoutDashboard size={18} />
            Dashboard
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Bell size={18} />
            <span className="flex-1">Alerts</span>
            <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">2</span>
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Globe size={18} />
            Sites
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Users size={18} />
            Clients
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <FileText size={18} />
            Reports
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Users size={18} />
            Users
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md text-sm font-medium">
            <Settings size={18} />
            Settings
          </a>
        </div>

        <div className="p-4 border-t border-slate-800">
          <button className="w-full flex items-center gap-3 mb-4 group text-left">
            <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center shrink-0 group-hover:bg-green-500 group-hover:text-white transition-colors">
              <Plus size={16} />
            </div>
            <div>
              <div className="text-sm font-medium text-slate-200">Add New Site</div>
              <div className="text-[11px] text-slate-400">Monitor a new WordPress site</div>
            </div>
          </button>
          
          <button className="w-full flex items-center gap-3 group text-left">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
              AY
            </div>
            <div className="flex-1 overflow-hidden">
              <div className="text-sm font-bold text-white truncate">Asfand Yar</div>
              <div className="text-[11px] text-slate-400 truncate">admin@sitepulse.local</div>
            </div>
            <ChevronDown size={14} className="text-slate-500" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Internal MVP</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">Dashboard</h1>
            <p className="text-sm text-slate-500">Monitor connected WordPress sites, update pressure, and sync freshness.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-xs font-medium text-slate-600">API Online</span>
              <div className="w-px h-3 bg-slate-300 mx-1"></div>
              <span className="text-xs text-slate-500">https://sitepulse-api-84m8.ornender.com</span>
              <button className="text-xs font-medium text-blue-600 ml-2">Test</button>
            </div>
            <div className="h-8 w-px bg-slate-200"></div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                AY
              </div>
              <span className="text-sm font-medium text-slate-700">Asfand Yar</span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
            <button className="text-xs font-medium text-slate-600 px-3 py-1.5 border border-slate-300 rounded-md hover:bg-slate-50">
              Logout
            </button>
          </div>
        </header>

        {/* Refresh bar */}
        <div className="bg-slate-50/80 px-6 py-2 flex justify-end items-center gap-3 border-b border-slate-100 shrink-0">
          <span className="text-xs text-slate-500">Last refreshed 3 seconds ago</span>
          <button className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-md text-xs font-medium transition-colors">
            <RefreshCw size={12} />
            Refresh
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-auto p-6 space-y-6">
          
          {/* Metric Cards Row */}
          <div className="grid grid-cols-5 gap-4">
            {/* Total Sites */}
            <div className="bg-white rounded-[12px] border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
                <Monitor size={20} />
              </div>
              <div className="text-[36px] font-[800] text-slate-900 leading-none mb-1">2</div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Total Sites</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                1 unknown
              </div>
            </div>

            {/* Healthy */}
            <div className="bg-white rounded-[12px] border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-3">
                <ShieldCheck size={20} />
              </div>
              <div className="text-[36px] font-[800] text-slate-900 leading-none mb-1">0</div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Healthy</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                No active flags
              </div>
            </div>

            {/* Needs Attention */}
            <div className="bg-white rounded-[12px] border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 text-yellow-600 flex items-center justify-center mb-3">
                <AlertTriangle size={20} />
              </div>
              <div className="text-[36px] font-[800] text-slate-900 leading-none mb-1">0</div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Needs Attention</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                No issues
              </div>
            </div>

            {/* Critical Risk */}
            <div className="bg-white rounded-[12px] border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mb-3">
                <ShieldAlert size={20} />
              </div>
              <div className="text-[36px] font-[800] text-slate-900 leading-none mb-1">1</div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Critical Risk</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                High-priority risk
              </div>
            </div>

            {/* Unmonitored Pages */}
            <div className="bg-white rounded-[12px] border border-slate-200 p-5 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
                <FileWarning size={20} />
              </div>
              <div className="text-[36px] font-[800] text-slate-900 leading-none mb-1">3</div>
              <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-2">Unmonitored Pages</div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Important pages
              </div>
            </div>
          </div>

          {/* Primary Row */}
          <div className="flex gap-6">
            {/* Website Health Overview */}
            <div className="bg-white border border-slate-200 rounded-[18px] w-[57%] flex flex-col shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Website Health Overview</h2>
                <Info size={14} className="text-slate-400" />
              </div>
              <div className="p-6 flex gap-8 flex-1 items-center">
                <div className="w-[180px] flex flex-col items-center justify-center shrink-0">
                  <div className="relative w-[130px] h-[130px] flex items-center justify-center mb-4">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                      <circle cx="50" cy="50" r="40" stroke="#22c55e" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset="55.26" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-4xl font-bold text-slate-900 leading-none">78</span>
                      <span className="text-sm font-medium text-slate-500">/100</span>
                    </div>
                  </div>
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">Overall Health Score</div>
                  <div className="bg-green-100 text-green-700 text-xs font-semibold px-2.5 py-1 rounded-full">Good</div>
                </div>
                
                <div className="flex-1">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">
                        <th className="pb-3 font-medium">Area</th>
                        <th className="pb-3 font-medium">Status</th>
                        <th className="pb-3 font-medium text-right">Score</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-slate-50">
                        <td className="py-3 font-medium text-slate-700 flex items-center gap-2">
                          <ShieldAlert size={14} className="text-amber-500" /> Security posture
                        </td>
                        <td className="py-3"><span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">Needs attention</span></td>
                        <td className="py-3 text-right font-medium text-slate-600">60/100</td>
                      </tr>
                      <tr className="border-b border-slate-50">
                        <td className="py-3 font-medium text-slate-700 flex items-center gap-2">
                          <Plug size={14} className="text-amber-500" /> Plugin update pressure
                        </td>
                        <td className="py-3"><span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">Some updates</span></td>
                        <td className="py-3 text-right font-medium text-slate-600">70/100</td>
                      </tr>
                      <tr className="border-b border-slate-50">
                        <td className="py-3 font-medium text-slate-700 flex items-center gap-2">
                          <Activity size={14} className="text-green-500" /> Monitoring coverage
                        </td>
                        <td className="py-3"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Good</span></td>
                        <td className="py-3 text-right font-medium text-slate-600">80/100</td>
                      </tr>
                      <tr className="border-b border-slate-50">
                        <td className="py-3 font-medium text-slate-700 flex items-center gap-2">
                          <RefreshCw size={14} className="text-green-500" /> Sync freshness
                        </td>
                        <td className="py-3"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Good</span></td>
                        <td className="py-3 text-right font-medium text-slate-600">90/100</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium text-slate-700 flex items-center gap-2">
                          <Clock size={14} className="text-green-500" /> Page response performance
                        </td>
                        <td className="py-3"><span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">Good</span></td>
                        <td className="py-3 text-right font-medium text-slate-600">85/100</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-slate-100 mt-auto">
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                  View full health report <ArrowRight size={14} className="ml-1" />
                </a>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="bg-white border border-slate-200 rounded-[18px] w-[43%] flex flex-col shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recommended Actions</h2>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                  View all actions <ArrowRight size={14} className="ml-1" />
                </a>
              </div>
              <div className="flex flex-col">
                {/* Action 1 */}
                <div className="p-5 flex gap-4 border-b border-slate-100">
                  <div className="shrink-0 mt-0.5">
                    <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">Critical</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 mb-1">Fix 2 critical WordPress security risks</div>
                    <div className="text-sm text-slate-500 mb-3">File editor enabled and debug mode active</div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">Thincscorp Website</span>
                      <button className="bg-red-600 text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-red-700">Fix Now</button>
                      <button className="text-slate-400 hover:text-slate-600 ml-auto"><MoreVertical size={16} /></button>
                    </div>
                  </div>
                </div>
                
                {/* Action 2 */}
                <div className="p-5 flex gap-4 border-b border-slate-100">
                  <div className="shrink-0 mt-0.5">
                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-full">High</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 mb-1">Enable monitoring for important pages</div>
                    <div className="text-sm text-slate-500 mb-3">3 important pages are not being monitored</div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">Thincscorp Website</span>
                      <button className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-md hover:bg-blue-700">Monitor</button>
                      <button className="text-slate-400 hover:text-slate-600 ml-auto"><MoreVertical size={16} /></button>
                    </div>
                  </div>
                </div>

                {/* Action 3 */}
                <div className="p-5 flex gap-4 border-b border-slate-100">
                  <div className="shrink-0 mt-0.5">
                    <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-1 rounded-full">Medium</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 mb-1">Update 1 outdated plugin</div>
                    <div className="text-sm text-slate-500 mb-3">1 plugin update is available</div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">Onset Demo Website</span>
                      <button className="bg-white border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-slate-50">Review</button>
                      <button className="text-slate-400 hover:text-slate-600 ml-auto"><MoreVertical size={16} /></button>
                    </div>
                  </div>
                </div>

                {/* Action 4 */}
                <div className="p-5 flex gap-4">
                  <div className="shrink-0 mt-0.5">
                    <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded-full">Low</span>
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 mb-1">Check sync freshness</div>
                    <div className="text-sm text-slate-500 mb-3">1 site not synced in last 24 hours</div>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">Onset Demo Website</span>
                      <button className="bg-white border border-slate-300 text-slate-700 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-slate-50">Open</button>
                      <button className="text-slate-400 hover:text-slate-600 ml-auto"><MoreVertical size={16} /></button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Row */}
          <div className="flex gap-6">
            {/* Recently Synced Sites */}
            <div className="bg-white border border-slate-200 rounded-[18px] w-[45%] flex flex-col shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recently Synced Sites</h2>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                  View all sites <ArrowRight size={14} className="ml-1" />
                </a>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4 font-medium">Site</th>
                      <th className="px-4 py-4 font-medium">Status</th>
                      <th className="px-4 py-4 font-medium">Last Seen</th>
                      <th className="px-4 py-4 font-medium">Plugin Updates</th>
                      <th className="px-6 py-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0">TC</div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">Thincscorp Website</div>
                            <div className="text-xs text-slate-500">thincscorp.com</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-1 rounded-full">Critical</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-900">5 hours ago</div>
                        <div className="text-xs text-slate-500">5 Jun 2026, 16:56</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-1 rounded-full">0 Updates</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={16} /></button>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold shrink-0">EC</div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">Onset Demo Website</div>
                            <div className="text-xs text-slate-500">example.com</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-1 rounded-full">Unknown</span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-900">16 hours ago</div>
                        <div className="text-xs text-slate-500">5 Jun 2026, 5:48</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2.5 py-1 rounded-full">1 Update</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-slate-400 hover:text-slate-600"><MoreVertical size={16} /></button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Monitoring Coverage */}
            <div className="bg-white border border-slate-200 rounded-[18px] w-[27%] flex flex-col shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Monitoring Coverage</h2>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                  View full report <ArrowRight size={14} className="ml-1" />
                </a>
              </div>
              <div className="p-6 flex flex-col items-center">
                <div className="relative w-[140px] h-[140px] flex items-center justify-center mb-2">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#f1f5f9" strokeWidth="12" fill="none" />
                    <circle cx="50" cy="50" r="40" stroke="#3b82f6" strokeWidth="12" fill="none" strokeDasharray="251.2" strokeDashoffset="60.28" strokeLinecap="round" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl font-bold text-slate-900 leading-none">76%</span>
                  </div>
                </div>
                <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-8">Coverage Score</div>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> Connected Sites
                    </div>
                    <div className="flex-1 border-b border-dotted border-slate-300 mx-3"></div>
                    <span className="font-bold text-slate-900">2</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-indigo-500"></span> Pages Discovered
                    </div>
                    <div className="flex-1 border-b border-dotted border-slate-300 mx-3"></div>
                    <span className="font-bold text-slate-900">14</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span> Pages Monitored
                    </div>
                    <div className="flex-1 border-b border-dotted border-slate-300 mx-3"></div>
                    <span className="font-bold text-slate-900">8</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span> Important Pages Unmonitored
                    </div>
                    <div className="flex-1 border-b border-dotted border-slate-300 mx-3"></div>
                    <span className="font-bold text-slate-900">3</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-slate-600">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span> Sites Synced (Last 12h)
                    </div>
                    <div className="flex-1 border-b border-dotted border-slate-300 mx-3"></div>
                    <span className="font-bold text-slate-900">1</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Pressure */}
            <div className="bg-white border border-slate-200 rounded-[18px] w-[28%] flex flex-col shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Update Pressure</h2>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                  View updates <ArrowRight size={14} className="ml-1" />
                </a>
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Plug size={20} />
                    </div>
                    <span className="font-semibold text-slate-800">Plugin Updates</span>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">1</span>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <Palette size={20} />
                    </div>
                    <span className="font-semibold text-slate-800">Theme Updates</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">0</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <Server size={20} />
                    </div>
                    <span className="font-semibold text-slate-800">WordPress Core</span>
                  </div>
                  <span className="bg-slate-100 text-slate-600 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">0</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                      <Globe size={20} />
                    </div>
                    <span className="font-semibold text-slate-800">Sites Needing Updates</span>
                  </div>
                  <span className="bg-amber-100 text-amber-700 text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center">1</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="flex gap-6 pb-6">
            {/* Recent Page Checks */}
            <div className="bg-white border border-slate-200 rounded-[18px] w-[60%] flex flex-col shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Page Checks</h2>
                <div className="flex gap-4">
                  <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                    Manage monitored pages <ArrowRight size={14} className="ml-1" />
                  </a>
                  <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                    View all page checks <ArrowRight size={14} className="ml-1" />
                  </a>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] font-medium text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="px-6 py-4 font-medium">Site</th>
                      <th className="px-4 py-4 font-medium">Page</th>
                      <th className="px-4 py-4 font-medium">Status</th>
                      <th className="px-4 py-4 font-medium">Response</th>
                      <th className="px-6 py-4 font-medium">Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-slate-100">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0">TC</div>
                          <div className="font-semibold text-slate-900 text-sm">Thincscorp Website</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-900">Homepage</div>
                        <div className="text-xs text-slate-500">https://thincscorp.com/</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-sm font-medium text-slate-700">OK</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-slate-700">3130 ms</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        2 hours ago
                      </td>
                    </tr>
                    <tr>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-[10px] font-bold shrink-0">TC</div>
                          <div className="font-semibold text-slate-900 text-sm">Thincscorp Website</div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-medium text-slate-900">Homepage</div>
                        <div className="text-xs text-slate-500">https://thincscorp.com/</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-sm font-medium text-slate-700">OK</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-sm font-medium text-slate-700">935 ms</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600">
                        14 hours ago
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white border border-slate-200 rounded-[18px] w-[40%] flex flex-col shadow-sm">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
                <a href="#" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center">
                  View all activity <ArrowRight size={14} className="ml-1" />
                </a>
              </div>
              <div className="p-6 relative">
                <div className="absolute left-[39px] top-6 bottom-6 w-px bg-slate-200"></div>
                <div className="space-y-6 relative">
                  
                  {/* Activity 1 */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center shrink-0 relative z-10 border-4 border-white">
                      <RefreshCw size={14} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-slate-900 text-sm">Thincscorp Website synced successfully</div>
                        <div className="text-xs text-slate-500 shrink-0 ml-4">5 hours ago</div>
                      </div>
                    </div>
                  </div>

                  {/* Activity 2 */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 relative z-10 border-4 border-white">
                      <AlertTriangle size={14} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-slate-900 text-sm">Debug mode is enabled</div>
                        <div className="text-xs text-slate-500 shrink-0 ml-4">5 hours ago</div>
                      </div>
                      <span className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-1 rounded-md">Thincscorp Website</span>
                    </div>
                  </div>

                  {/* Activity 3 */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 relative z-10 border-4 border-white">
                      <Monitor size={14} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-slate-900 text-sm">Homepage checked</div>
                        <div className="text-xs text-slate-500 shrink-0 ml-4">2 hours ago</div>
                      </div>
                      <span className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-1 rounded-md">Thincscorp Website</span>
                    </div>
                  </div>

                  {/* Activity 4 */}
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 relative z-10 border-4 border-white">
                      <FileWarning size={14} />
                    </div>
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-medium text-slate-900 text-sm">New important page discovered</div>
                        <div className="text-xs text-slate-500 shrink-0 ml-4">1 day ago</div>
                      </div>
                      <span className="bg-slate-100 text-slate-700 text-[11px] font-medium px-2 py-1 rounded-md">/pricing</span>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
