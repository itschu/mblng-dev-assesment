'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, removeToken } from '../lib/auth';
import { GameAPI } from '../lib/api';

export default function Leaderboard() {
	const [leaderboard, setLeaderboard] = useState([]);
	const [filter, setFilter] = useState('all');
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');
	const [user, setUser] = useState<any>(null);
	const router = useRouter();

	useEffect(() => {
		const currentUser = getCurrentUser();

		if (!currentUser) {
			router.push('/');
			return;
		}

		setUser(currentUser);
		fetchLeaderboard();
	}, [filter]);

	const fetchLeaderboard = async () => {
		setIsLoading(true);
		setError('');

		try {
			console.log('Fetching leaderboard with filter:', filter);

			const data = await GameAPI.getLeaderboard(filter);
			console.log('Leaderboard API response:', data);

			if (data.success === false) {
				throw new Error(data.error || 'Failed to load leaderboard');
			}

			setLeaderboard(data.leaderboard || []);
			console.log('Leaderboard data set:', data.leaderboard?.length || 0, 'players');
		} catch (error: any) {
			console.error('Leaderboard fetch error:', error);
			setError(error.message || 'Failed to load leaderboard');

			if (error.message && (error.message.includes('token') || error.message.includes('auth'))) {
				removeToken();
				router.push('/');
			}
		} finally {
			setIsLoading(false);
		}
	};

	const backToLobby = () => {
		router.push('/home');
	};

	const logout = () => {
		removeToken();
		router.push('/');
	};

	if (!user) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
			<nav className="bg-white shadow-sm border-b">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-16">
						<div className="flex items-center">
							<h1 className="text-xl font-bold text-gray-900">Number Game</h1>
						</div>
						<div className="flex items-center space-x-4">
							<span className="text-sm text-gray-600">Welcome, {user.username}</span>
							<button onClick={backToLobby} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
								Back to Lobby
							</button>
							<button onClick={logout} className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer">
								Logout
							</button>
						</div>
					</div>
				</div>
			</nav>

			<main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
				<div className="bg-white rounded-2xl shadow-xl p-8">
					<div className="text-center mb-8">
						<h2 className="text-3xl font-bold text-gray-900 mb-4">Leaderboard</h2>
						<p className="text-gray-600">Top players by number of wins</p>
					</div>

					<div className="flex justify-center mb-6">
						<div className="bg-gray-100 rounded-lg p-1 flex space-x-1">
							{[
								{ value: 'all', label: 'All Time' },
								{ value: 'daily', label: 'Today' },
								{ value: 'weekly', label: 'This Week' },
								{ value: 'monthly', label: 'This Month' },
							].map((option) => (
								<button key={option.value} onClick={() => setFilter(option.value)} className={`px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${filter === option.value ? 'bg-blue-600 text-white' : 'text-gray-700 hover:text-gray-900'}`}>
									{option.label}
								</button>
							))}
						</div>
					</div>

					{error && (
						<div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-700">
							<p className="font-medium">Error loading leaderboard:</p>
							<p className="text-sm mt-1">{error}</p>
						</div>
					)}

					{isLoading ? (
						<div className="text-center py-8">
							<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
							<p className="text-gray-600">Loading leaderboard...</p>
						</div>
					) : leaderboard.length > 0 ? (
						<div className="space-y-4">
							{leaderboard.map((player: any, index: number) => (
								<div
									key={player.id}
									className={`flex items-center justify-between p-4 rounded-lg border-2 ${player.username === user.username ? 'border-blue-600 bg-blue-50' : 'border-gray-200 bg-gray-50'} ${index < 3 ? 'bg-gradient-to-r' : ''} ${
										index === 0 ? 'from-yellow-100 to-yellow-50 border-yellow-400' : index === 1 ? 'from-gray-100 to-gray-50 border-gray-400' : index === 2 ? 'from-orange-100 to-orange-50 border-orange-400' : ''
									}`}
								>
									<div className="flex items-center space-x-4">
										<div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-yellow-500 text-white' : index === 1 ? 'bg-gray-500 text-white' : index === 2 ? 'bg-orange-500 text-white' : 'bg-blue-600 text-white'}`}>
											{index < 3 ? ['🥇', '🥈', '🥉'][index] : index + 1}
										</div>
										<div>
											<p className="font-semibold text-gray-900">
												{player.username}
												{player.username === user.username && <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">You</span>}
											</p>
											<p className="text-sm text-gray-600">
												{player.total_wins} wins • {player.total_losses} losses
											</p>
										</div>
									</div>
									<div className="text-right">
										<p className="text-lg font-bold text-green-600">{player.total_wins}</p>
										<p className="text-xs text-gray-500">wins</p>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-8">
							<p className="text-gray-600 text-lg">No players found for this period</p>
							<p className="text-gray-500 text-sm mt-2">Play some games to see the leaderboard!</p>
						</div>
					)}

					<div className="mt-8 bg-blue-50 rounded-xl p-6">
						<h3 className="text-lg font-semibold text-blue-900 mb-3">Game Statistics</h3>
						<div className="text-sm text-blue-800">
							<p>• Real-time leaderboard updates after each game</p>
							<p>• Time-based filtering: All-time, Daily, Weekly, Monthly</p>
							<p>• Rankings based on total wins with username tiebreaker</p>
							<p>• Statistics calculated from completed game sessions</p>
						</div>
					</div>
				</div>
			</main>
		</div>
	);
}
