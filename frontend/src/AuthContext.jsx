import { AuthProvider as BaseAuthProvider } from './auth-context';

export function AuthProvider({ children }) {
	return <BaseAuthProvider>{children}</BaseAuthProvider>;
}
