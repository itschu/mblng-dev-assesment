import type { Metadata } from 'next';
import { Pacifico } from 'next/font/google';
import './globals.css';

const pacifico = Pacifico({
	weight: '400',
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-pacifico',
});

export const metadata: Metadata = {
	title: 'MBLNG Assessment',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en" suppressHydrationWarning={true}>
			<body className={` ${pacifico.variable} antialiased`}>{children}</body>
		</html>
	);
}
