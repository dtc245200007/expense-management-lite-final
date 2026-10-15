import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";


export function ConnectionStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div className="connection-status" role="status" aria-live="polite">
      <WifiOff size={17} aria-hidden="true" />
      <span>Bạn đang ngoại tuyến. Dữ liệu chỉ cập nhật khi kết nối lại.</span>
    </div>
  );
}
