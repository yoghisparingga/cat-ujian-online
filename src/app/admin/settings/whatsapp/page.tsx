import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getWhatsAppSetting } from "@/lib/whatsapp";
import { WhatsAppSettingsClient } from "./WhatsAppSettingsClient";

export const dynamic = "force-dynamic";

export default async function WhatsAppSettingsPage() {
  await requireAdmin();
  const [setting, logs] = await Promise.all([
    getWhatsAppSetting(),
    prisma.whatsAppMessageLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="p-8 max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Setting WhatsApp Gateway</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Format awal fleksibel: POST ke endpoint custom dengan Bearer API key dan body
          sender_id, phone_number, message.
        </p>
      </div>
      <WhatsAppSettingsClient
        initialSetting={{
          senderId: setting.senderId ?? "",
          apiKey: setting.apiKeyEncrypted ? "********" : "",
          urlEndpoint: setting.urlEndpoint ?? "",
          isActive: setting.isActive,
          loginOtpTemplate: setting.loginOtpTemplate,
          registrationOtpTemplate: setting.registrationOtpTemplate,
          verifyPhoneOtpTemplate: setting.verifyPhoneOtpTemplate,
        }}
      />
      <div className="card p-5">
        <div className="font-semibold mb-3">Log Pengiriman Terakhir</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-zinc-500">
              <tr>
                <th className="py-2">Waktu</th>
                <th className="py-2">Nomor</th>
                <th className="py-2">Tipe</th>
                <th className="py-2">Status</th>
                <th className="py-2">Error</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-t border-zinc-100">
                  <td className="py-2 text-xs">{log.createdAt.toLocaleString()}</td>
                  <td className="py-2">{log.normalizedPhoneNumber}</td>
                  <td className="py-2">{log.messageType}</td>
                  <td className="py-2">{log.status}</td>
                  <td className="py-2 text-red-600">{log.errorMessage}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-3 text-zinc-500">
                    Belum ada log.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card p-5 text-sm text-zinc-600 space-y-2">
        <div className="font-semibold text-zinc-900">Catatan implementasi gateway custom</div>
        <p>
          Seluruh logic request gateway berada di CustomWhatsAppGatewayProvider sehingga format
          payload dapat diganti di satu tempat bila gateway custom Anda berbeda.
        </p>
      </div>
    </main>
  );
}
