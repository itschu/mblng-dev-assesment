import { getStoredToken } from './auth';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export class GameAPI {
	static async login(username: string) {
		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
			},
			body: JSON.stringify({ username }),
		});

		if (!response.ok) {
			const error = await response.text();
			try {
				const errorData = JSON.parse(error);
				throw new Error(errorData.error || 'Login failed');
			} catch {
				throw new Error('Network error. Please check your connection.');
			}
		}

		return response.json();
	}

	static async getCurrentSession() {
		const token = getStoredToken();
		if (!token) throw new Error('No authentication token');

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		const response = await fetch(`${SUPABASE_URL}/functions/v1/game-current-session`, {
			headers: {
				Authorization: `Bearer ${token}`,
				apikey: SUPABASE_ANON_KEY,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			try {
				const errorData = JSON.parse(error);
				throw new Error(errorData.error || 'Failed to get current session');
			} catch {
				throw new Error('Network error. Please try again.');
			}
		}

		return response.json();
	}

	static async joinSession() {
		const token = getStoredToken();
		if (!token) throw new Error('No authentication token');

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		const response = await fetch(`${SUPABASE_URL}/functions/v1/game-join-session`, {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${token}`,
				apikey: SUPABASE_ANON_KEY,
				'Content-Type': 'application/json',
			},
		});

		if (!response.ok) {
			const error = await response.text();
			try {
				const errorData = JSON.parse(error);
				throw new Error(errorData.error || 'Failed to join session');
			} catch {
				throw new Error('Network error. Please try again.');
			}
		}

		return response.json();
	}

	static async selectNumber(number: number) {
		const token = getStoredToken();
		if (!token) throw new Error('No authentication token');

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		console.log('Sending select number request:', { number, token: token ? 'present' : 'missing' });

		try {
			const response = await fetch(`${SUPABASE_URL}/functions/v1/game-select-number`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					apikey: SUPABASE_ANON_KEY,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ number }),
			});

			console.log('Select number response status:', response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Select number error response:', errorText);

				try {
					const errorData = JSON.parse(errorText);
					throw new Error(errorData.error || `HTTP ${response.status}: Failed to select number`);
				} catch (parseError) {
					console.error('Error parsing error response:', parseError);
					throw new Error(`HTTP ${response.status}: Network error while selecting number`);
				}
			}

			const result = await response.json();
			console.log('Select number success:', result);
			return result;
		} catch (fetchError) {
			console.error('Select number fetch error:', fetchError);

			if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
				throw new Error('Network connection failed. Please check your internet connection.');
			}

			throw fetchError;
		}
	}

	static async getLeaderboard(filter: string = 'all') {
		const token = getStoredToken();
		if (!token) throw new Error('No authentication token');

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		const response = await fetch(`${SUPABASE_URL}/functions/v1/game-leaderboard?filter=${filter}`, {
			headers: {
				Authorization: `Bearer ${token}`,
				apikey: SUPABASE_ANON_KEY,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			try {
				const errorData = JSON.parse(error);
				throw new Error(errorData.error || 'Failed to get leaderboard');
			} catch {
				throw new Error('Network error. Please try again.');
			}
		}

		return response.json();
	}

	static async getMySession() {
		const token = getStoredToken();
		if (!token) throw new Error('No authentication token');

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		const response = await fetch(`${SUPABASE_URL}/functions/v1/game-my-session`, {
			headers: {
				Authorization: `Bearer ${token}`,
				apikey: SUPABASE_ANON_KEY,
			},
		});

		if (!response.ok) {
			const error = await response.text();
			try {
				const errorData = JSON.parse(error);
				throw new Error(errorData.error || 'Failed to get my session');
			} catch {
				throw new Error('Network error. Please try again.');
			}
		}

		return response.json();
	}

	static async leaveSession() {
		const token = getStoredToken();
		if (!token) throw new Error('No authentication token');

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		console.log('Sending leave session request with token:', token ? 'present' : 'missing');

		try {
			const response = await fetch(`${SUPABASE_URL}/functions/v1/game-leave-session`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
					apikey: SUPABASE_ANON_KEY,
					'Content-Type': 'application/json',
				},
			});

			console.log('Leave session response status:', response.status);

			if (!response.ok) {
				const errorText = await response.text();
				console.error('Leave session error response:', errorText);

				try {
					const errorData = JSON.parse(errorText);
					throw new Error(errorData.error || `HTTP ${response.status}: Failed to leave session`);
				} catch (parseError) {
					console.error('Error parsing leave session error response:', parseError);
					throw new Error(`HTTP ${response.status}: Network error while leaving session`);
				}
			}

			const result = await response.json();
			console.log('Leave session success:', result);
			return result;
		} catch (fetchError) {
			console.error('Leave session fetch error:', fetchError);

			if (fetchError instanceof TypeError && fetchError.message.includes('fetch')) {
				throw new Error('Network connection failed. Please check your internet connection.');
			}

			throw fetchError;
		}
	}
}
