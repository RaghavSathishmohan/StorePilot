import { redirect } from 'next/navigation'

export default function AlertsPage() {
  redirect('/dashboard/analytics?tab=alerts')
}
