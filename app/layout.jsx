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
    <html lang="en">
      <head>
        <link rel="icon" href="data:," />
      </head>
      <body>
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
