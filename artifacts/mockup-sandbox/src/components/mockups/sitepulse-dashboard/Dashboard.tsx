import React from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  CheckCircle2,
  ChevronRight,
  Clock,
  Files,
  Globe,
  LayoutDashboard,
  RefreshCw,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Zap,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';

export function Dashboard() {
  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        .font-jakarta { font-family: 'Plus Jakarta Sans', sans-serif; }
        .bg-slate-sidebar { background-color: #0f172a; }
      `}} />
      <div className="flex h-screen w-full bg-[#f8fafc] text-slate-900 font-jakarta overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-64 bg-slate-sidebar text-slate-300 flex flex-col hidden md:flex border-r border-slate-800 shrink-0">
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight tracking-tight">SitePulse</h1>
                <p className="text-xs text-slate-500 font-medium">by Onset Media</p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-4 py-2 space-y-1">
            <a href="#" className="flex items-center gap-3 px-3 py-2 bg-blue-600/10 text-blue-400 rounded-md font-medium">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors rounded-md font-medium text-slate-400">
              <Globe className="w-4 h-4" />
              Sites
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors rounded-md font-medium text-slate-400">
              <Bell className="w-4 h-4" />
              Alerts
              <span className="ml-auto bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded-full">4</span>
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors rounded-md font-medium text-slate-400">
              <Files className="w-4 h-4" />
              Pages
            </a>
            <a href="#" className="flex items-center gap-3 px-3 py-2 hover:bg-slate-800 hover:text-white transition-colors rounded-md font-medium text-slate-400">
              <Settings className="w-4 h-4" />
              Settings
            </a>
          </div>

          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="w-8 h-8 rounded-md bg-slate-700">
                <AvatarFallback className="bg-slate-700 text-white rounded-md text-xs">JD</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">Jane Doe</p>
                <p className="text-xs text-slate-500 truncate">Agency Owner</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Top Bar */}
          <header className="h-16 flex items-center justify-between px-8 bg-white/50 backdrop-blur-md border-b border-slate-200 z-10 shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
              <p className="text-xs text-slate-500 font-medium">{currentDate}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-medium h-9 px-4 rounded-lg">
                <RefreshCw className="w-4 h-4 mr-2" />
                Sync All
              </Button>
            </div>
          </header>

          <ScrollArea className="flex-1 p-8">
            <div className="max-w-7xl mx-auto space-y-6 pb-12">
              
              {/* Stat Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-blue-600">
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-slate-500 mb-1">Total Sites</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-bold tracking-tight text-slate-900">12</h3>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-emerald-500">
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-slate-500 mb-1">Healthy</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-bold tracking-tight text-slate-900">8</h3>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-amber-500 bg-amber-50/30">
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-slate-500 mb-1">Needs Attention</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-bold tracking-tight text-amber-600">3</h3>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-red-500 bg-red-50/30">
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-slate-500 mb-1">Critical Risk</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-bold tracking-tight text-red-600">1</h3>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden border-l-4 border-l-slate-400">
                  <CardContent className="p-5">
                    <p className="text-sm font-medium text-slate-500 mb-1">Unmonitored Pages</p>
                    <div className="flex items-baseline gap-2">
                      <h3 className="text-4xl font-bold tracking-tight text-slate-700">4</h3>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Two Column Section 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Health Overview */}
                <Card className="lg:col-span-2 rounded-xl shadow-sm border-slate-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Network Health Overview</CardTitle>
                    <CardDescription>Aggregate health metrics across 12 sites</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col md:flex-row items-center gap-8 pt-4">
                    {/* Ring */}
                    <div className="relative w-40 h-40 flex items-center justify-center shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="10" />
                        <circle 
                          cx="50" cy="50" r="45" 
                          fill="none" 
                          stroke="#2563eb" 
                          strokeWidth="10" 
                          strokeDasharray={`${74 * 2.827} 282.7`} 
                          strokeLinecap="round" 
                        />
                      </svg>
                      <div className="absolute flex flex-col items-center justify-center">
                        <span className="text-4xl font-bold text-slate-900 tracking-tighter">74</span>
                        <span className="text-xs text-slate-500 font-medium">/ 100</span>
                      </div>
                    </div>

                    {/* Bars */}
                    <div className="flex-1 w-full space-y-4">
                      <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                          <span className="font-medium text-slate-700">Security Posture</span>
                          <span className="font-semibold text-emerald-600">88%</span>
                        </div>
                        <Progress value={88} className="h-2 [&>div]:bg-emerald-500" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                          <span className="font-medium text-slate-700">Sync Freshness</span>
                          <span className="font-semibold text-emerald-600">90%</span>
                        </div>
                        <Progress value={90} className="h-2 [&>div]:bg-emerald-500" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                          <span className="font-medium text-slate-700">Page Response</span>
                          <span className="font-semibold text-blue-600">81%</span>
                        </div>
                        <Progress value={81} className="h-2 [&>div]:bg-blue-500" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                          <span className="font-medium text-slate-700">Monitoring Coverage</span>
                          <span className="font-semibold text-amber-500">72%</span>
                        </div>
                        <Progress value={72} className="h-2 [&>div]:bg-amber-500" />
                      </div>
                      <div>
                        <div className="flex justify-between mb-1.5 text-sm">
                          <span className="font-medium text-slate-700">Plugin Update Pressure</span>
                          <span className="font-semibold text-amber-500">61%</span>
                        </div>
                        <Progress value={61} className="h-2 [&>div]:bg-amber-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Recommended Actions */}
                <Card className="rounded-xl shadow-sm border-slate-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">Recommended Actions</CardTitle>
                    <CardDescription>Prioritized tasks for your attention</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Action 1 */}
                    <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-red-500 shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 mb-1">Critical Update Required</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-white border-slate-200 text-xs font-medium text-slate-600">acme-corp.com</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">WooCommerce 8.4 security patch</p>
                          <Button size="sm" variant="outline" className="h-7 text-xs font-medium">Review Update</Button>
                        </div>
                      </div>
                    </div>
                    {/* Action 2 */}
                    <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 mb-1">5 pages unmonitored</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-white border-slate-200 text-xs font-medium text-slate-600">studio-xyz.io</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">Important pages not tracked</p>
                          <Button size="sm" variant="outline" className="h-7 text-xs font-medium">Configure Pages</Button>
                        </div>
                      </div>
                    </div>
                    {/* Action 3 */}
                    <div className="p-4 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                        <div className="flex-1">
                          <h4 className="text-sm font-semibold text-slate-900 mb-1">Plugin updates available</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="secondary" className="bg-white border-slate-200 text-xs font-medium text-slate-600">greenleaf.co</Badge>
                          </div>
                          <p className="text-xs text-slate-500 mb-3">3 plugins need updating</p>
                          <Button size="sm" variant="outline" className="h-7 text-xs font-medium">View Plugins</Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Two Column Section 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Recently Synced Sites Table */}
                <Card className="rounded-xl shadow-sm border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Recently Synced Sites</CardTitle>
                        <CardDescription>Latest status from connected environments</CardDescription>
                      </div>
                      <Button variant="ghost" size="sm" className="text-blue-600 text-xs">View all</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead className="pl-6">Site</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Updates</TableHead>
                          <TableHead className="text-right pr-6">Last Sync</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                          <TableCell className="pl-6 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 rounded bg-blue-100 text-blue-700">
                                <AvatarFallback className="text-[10px] rounded font-bold">AC</AvatarFallback>
                              </Avatar>
                              acme-corp.com
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">Healthy</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">0</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">2 min ago</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/80 transition-colors cursor-pointer group bg-amber-50/10">
                          <TableCell className="pl-6 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 rounded bg-amber-100 text-amber-700">
                                <AvatarFallback className="text-[10px] rounded font-bold">SX</AvatarFallback>
                              </Avatar>
                              studio-xyz.io
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">Warning</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">5</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">18 min ago</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/80 transition-colors cursor-pointer group">
                          <TableCell className="pl-6 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 rounded bg-emerald-100 text-emerald-700">
                                <AvatarFallback className="text-[10px] rounded font-bold">GL</AvatarFallback>
                              </Avatar>
                              greenleaf.co
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">Healthy</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">0</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">1 hr ago</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/80 transition-colors cursor-pointer group bg-red-50/10">
                          <TableCell className="pl-6 font-medium text-slate-900">
                            <div className="flex items-center gap-2">
                              <Avatar className="w-6 h-6 rounded bg-red-100 text-red-700">
                                <AvatarFallback className="text-[10px] rounded font-bold">DP</AvatarFallback>
                              </Avatar>
                              dev-portfolio.net
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 font-medium">Critical</Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">12</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">3 hr ago</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  {/* Update Pressure Panel */}
                  <Card className="rounded-xl shadow-sm border-slate-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Update Pressure</CardTitle>
                      <CardDescription>Pending updates across your network</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-sm font-medium text-slate-500 mb-1">Plugin Updates</p>
                          <p className="text-2xl font-bold text-slate-900">18</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                          <p className="text-sm font-medium text-slate-500 mb-1">Theme Updates</p>
                          <p className="text-2xl font-bold text-slate-900">3</p>
                        </div>
                        <div className="p-4 bg-red-50/50 rounded-lg border border-red-100">
                          <p className="text-sm font-medium text-red-600 mb-1">WordPress Core</p>
                          <p className="text-2xl font-bold text-red-700">1</p>
                        </div>
                        <div className="p-4 bg-amber-50/50 rounded-lg border border-amber-100">
                          <p className="text-sm font-medium text-amber-600 mb-1">Sites Needing Updates</p>
                          <p className="text-2xl font-bold text-amber-700">4</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monitoring Coverage Panel */}
                  <Card className="rounded-xl shadow-sm border-slate-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg">Monitoring Coverage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-6 mb-6">
                        <div className="text-3xl font-bold text-blue-600">72%</div>
                        <div className="flex-1">
                          <Progress value={72} className="h-2 [&>div]:bg-blue-600" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Connected sites</span>
                          <span className="font-semibold text-slate-900">12</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pages discovered</span>
                          <span className="font-semibold text-slate-900">147</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Pages monitored</span>
                          <span className="font-semibold text-slate-900">106</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Important unmonitored</span>
                          <span className="font-semibold text-amber-600">4</span>
                        </div>
                        <div className="flex justify-between col-span-2 pt-2 border-t border-slate-100 mt-2">
                          <span className="text-slate-500">Synced last 12h</span>
                          <span className="font-semibold text-emerald-600">9</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div>

              {/* Two Column Section 3 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recent Page Checks */}
                <Card className="lg:col-span-2 rounded-xl shadow-sm border-slate-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">Recent Page Checks</CardTitle>
                        <CardDescription>Real-time uptime and performance</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow>
                          <TableHead className="pl-6">Page</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Response</TableHead>
                          <TableHead className="text-right pr-6">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow className="hover:bg-slate-50/80">
                          <TableCell className="pl-6">
                            <span className="font-medium text-slate-900">acme-corp.com</span>
                            <span className="text-slate-500"> / Homepage</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Healthy</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">243ms</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">just now</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/80">
                          <TableCell className="pl-6">
                            <span className="font-medium text-slate-900">acme-corp.com</span>
                            <span className="text-slate-500"> / Shop</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Healthy</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">312ms</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">2 min</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/80 bg-amber-50/10">
                          <TableCell className="pl-6">
                            <span className="font-medium text-slate-900">studio-xyz.io</span>
                            <span className="text-slate-500"> / Portfolio</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Slow</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-amber-600 font-bold">1840ms</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">8 min</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/80">
                          <TableCell className="pl-6">
                            <span className="font-medium text-slate-900">studio-xyz.io</span>
                            <span className="text-slate-500"> / Contact</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Healthy</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">198ms</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">12 min</TableCell>
                        </TableRow>
                        <TableRow className="hover:bg-slate-50/80">
                          <TableCell className="pl-6">
                            <span className="font-medium text-slate-900">greenleaf.co</span>
                            <span className="text-slate-500"> / Home</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Healthy</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-600">267ms</TableCell>
                          <TableCell className="text-right pr-6 text-slate-500 text-sm">22 min</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="rounded-xl shadow-sm border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                    <CardDescription>Events across your network</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                      
                      {/* Event 1 */}
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-blue-100 text-blue-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <RefreshCw className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">Sync completed</span>
                            <span className="text-xs text-slate-500">acme-corp.com • 2 min ago</span>
                          </div>
                        </div>
                      </div>

                      {/* Event 2 */}
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-red-100 text-red-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-red-600">Critical alert raised</span>
                            <span className="text-xs text-slate-500">dev-portfolio.net • 3 hr ago</span>
                          </div>
                        </div>
                      </div>

                      {/* Event 3 */}
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-100 text-amber-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">Plugin update detected</span>
                            <span className="text-xs text-slate-500">studio-xyz.io • 18 min ago</span>
                          </div>
                        </div>
                      </div>

                      {/* Event 4 */}
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-amber-100 text-amber-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <Clock className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">Page check failed</span>
                            <span className="text-xs text-slate-500">studio-xyz.io/portfolio • 8 min ago</span>
                          </div>
                        </div>
                      </div>

                      {/* Event 5 */}
                      <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-emerald-100 text-emerald-600 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] pl-4 md:pl-0 md:group-odd:pr-6 md:group-even:pl-6">
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-slate-900">New site connected</span>
                            <span className="text-xs text-slate-500">media-lab.co • 1 day ago</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          </ScrollArea>
        </div>
      </div>
    </>
  );
}
