import { Compass } from "lucide-react";
import { Link, useRouteError } from "react-router-dom";

/** Used both for unknown URLs and as the router's error boundary. */
export function NotFoundPage({ crashed = false }: { crashed?: boolean }) {
  const error = useRouteError();
  if (crashed && error) console.error(error);

  return (
    <div className="grid min-h-screen place-items-center bg-slate-50 px-4 text-center">
      <div>
        <Compass className="mx-auto text-brand-600" size={40} aria-hidden />
        <h1 className="mt-4 text-2xl font-bold text-slate-950">{crashed ? "Bir şeyler ters gitti" : "Sayfa bulunamadı"}</h1>
        <p className="mt-2 text-sm text-slate-500">
          {crashed ? "Beklenmeyen bir hata oluştu. Sayfayı yenilemeyi veya ana sayfaya dönmeyi deneyin." : "Aradığınız sayfa taşınmış veya hiç var olmamış olabilir."}
        </p>
        <Link to="/" className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
          Ana sayfaya dön
        </Link>
      </div>
    </div>
  );
}
