import './globals.css';
import { ToastProvider } from '../components/common/Toast';
import { AuthProvider } from '../context/AuthContext';
import AppShell from '../components/layout/AppShell';

export const metadata = {
  title: 'Retail & Repair Management — Professional Blue Edition',
  description: 'Enterprise ERP and Repair Workshop Management System',
  icons: {
    icon: 'data:,'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="data:," />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,300;0,400;0,500;0,700;0,900;1,400;1,500;1,700&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <ToastProvider>
          <AuthProvider>
            <AppShell>
              {children}
            </AppShell>
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
