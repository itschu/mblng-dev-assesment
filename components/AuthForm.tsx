'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticateUser, getCurrentUser } from '../lib/auth';

export default function AuthForm() {
	const [username, setUsername] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [isCheckingAuth, setIsCheckingAuth] = useState(true);
	const router = useRouter();

	useEffect(() => {
		const currentUser = getCurrentUser();
		if (currentUser) {
			router.push('/home');
		} else {
			setIsCheckingAuth(false);
		}
	}, [router]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!username.trim()) {
			setError('Please enter a username');
			return;
		}

		if (username.trim().length < 3) {
			setError('Username must be at least 3 characters long');
			return;
		}

		setIsLoading(true);
		setError('');

		try {
			await authenticateUser(username.trim());
			router.push('/home');
		} catch (error: any) {
			setError(error.message || 'Authentication failed');
		} finally {
			setIsLoading(false);
		}
	};

	if (isCheckingAuth) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
				<div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
						<p className="text-gray-600">Checking authentication...</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
			<div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
				<div className="text-center mb-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-2">Number Game</h1>
					<p className="text-gray-600">Enter your username to join the game</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					<div>
						<label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
							Username
						</label>
						<input
							type="text"
							id="username"
							value={username}
							onChange={(e) => setUsername(e.target.value)}
							className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
							placeholder="Enter your username (min 3 characters)"
							disabled={isLoading}
							minLength={3}
							maxLength={20}
						/>
					</div>

					{error && <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>}

					<button type="submit" disabled={isLoading || username.trim().length < 3} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:cursor-not-allowed">
						{isLoading ? 'Authenticating...' : 'Join Game'}
					</button>
				</form>

				<div className="mt-6 text-center text-sm text-gray-500">
					<p>Pick a number from 1-9 and compete to win!</p>
					<p className="mt-2 text-xs">Using JWT authentication with username-only login</p>
				</div>
			</div>
		</div>
	);
}
