export interface User {
	id: string;
	username: string;
	total_wins: number;
	total_losses: number;
	is_logged_in: boolean;
	created_at: string;
}

export function getStoredToken(): string | null {
	if (typeof window !== 'undefined') {
		return localStorage.getItem('gameToken');
	}
	return null;
}

export function storeToken(token: string): void {
	if (typeof window !== 'undefined') {
		localStorage.setItem('gameToken', token);
	}
}

export function removeToken(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem('gameToken');
		localStorage.removeItem('currentUser');
	}
}

export async function authenticateUser(username: string) {
	try {
		const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
			throw new Error('Supabase configuration missing');
		}

		const response = await fetch(`${SUPABASE_URL}/functions/v1/auth-login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
			},
			body: JSON.stringify({ username: username.trim() }),
		});

		if (!response.ok) {
			const errorText = await response.text();
			let errorMessage = 'Authentication failed';

			try {
				const errorData = JSON.parse(errorText);
				errorMessage = errorData.error || errorMessage;
			} catch {
				errorMessage = 'Network error. Please check your connection.';
			}

			throw new Error(errorMessage);
		}

		const data = await response.json();

		storeToken(data.token);
		localStorage.setItem('currentUser', JSON.stringify(data.user));

		return { token: data.token, user: data.user };
	} catch (error) {
		console.error('Authentication error:', error);
		throw error;
	}
}

export async function logoutUser() {
	try {
		const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
		const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
		const token = getStoredToken();

		if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !token) {
			removeToken();
			return;
		}

		await fetch(`${SUPABASE_URL}/functions/v1/auth-logout`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
				apikey: SUPABASE_ANON_KEY,
			},
		});

		removeToken();
	} catch (error) {
		console.error('Logout error:', error);
		removeToken();
	}
}

export function getCurrentUser() {
	if (typeof window !== 'undefined') {
		const userData = localStorage.getItem('currentUser');
		const token = getStoredToken();

		if (userData && token) {
			try {
				const user = JSON.parse(userData);
				return user;
			} catch (error) {
				console.error('Error parsing user data:', error);
				removeToken();
			}
		}
	}
	return null;
}
