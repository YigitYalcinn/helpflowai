import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock, Ticket } from "lucide-react";
import { Card } from "../components/ui/Card";
import { api } from "../lib/api";
import { ApiResponse } from "../types";

type DashboardStats = { total: number; open: number; inProgress: number; resolved: number; urgent: number; role: string };

export function DashboardPage({ scope }: { scope: "employee" | "it" | "admin" }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<ApiResponse<DashboardStats>>(`/dashboard/${scope}`).then((res) => setStats(res.data.data));
  }, [scope]);

  const cards = [
    { label: "Toplam Talep", value: stats?.total ?? 0, icon: Ticket },
    { label: "Açık", value: stats?.open ?? 0, icon: Clock },
    { label: "İşlemde", value: stats?.inProgress ?? 0, icon: Activity },
    { label: "Çözülen", value: stats?.resolved ?? 0, icon: CheckCircle2 },
    { label: "Acil", value: stats?.urgent ?? 0, icon: AlertTriangle }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-950">Dashboard</h1>
        <p className="text-sm text-slate-500">Talep yoğunluğu, durumlar ve öncelik takibi.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {cards.map((item) => (
          <Card key={item.label}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{item.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-950">{item.value}</p>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-brand-50 text-brand-700"><item.icon size={21} /></span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
