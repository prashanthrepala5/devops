import './globals.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

export const metadata = {
  title: 'ReachOps Portal — Resume Upload & Candidate Management',
  description:
    'Upload resumes and manage candidate profiles for LinkedIn recruiter outreach automation.',
};

export const viewport = {
  themeColor: '#0a0f1c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main className="page-wrapper">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
