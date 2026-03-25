import { IBM_Plex_Sans, Space_Grotesk } from "next/font/google";

import { AuthProvider } from "../hooks/useAuth";
import "../styles/globals.css";

const displayFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display"
});

const bodyFont = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-body"
});

export default function App({ Component, pageProps }) {
  return (
    <AuthProvider>
      <div className={`${displayFont.variable} ${bodyFont.variable}`}>
        <Component {...pageProps} />
      </div>
    </AuthProvider>
  );
}
