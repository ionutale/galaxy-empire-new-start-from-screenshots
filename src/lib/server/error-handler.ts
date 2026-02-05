import { dev } from '$app/environment';

export class ErrorHandler {
	private static logError(error: Error, context?: unknown) {
		const timestamp = new Date().toISOString();
		const errorInfo = {
			timestamp,
			message: error.message,
			stack: error.stack,
			context
		};

		if (dev) {
			console.error('Error:', errorInfo);
		} else {
			// In production, you might want to send to a logging service
			console.error('Error:', errorInfo);
		}
	}

	static handleApiError(error: unknown, operation: string): { success: false; error: string } {
		const err = error instanceof Error ? error : new Error(String(error));
		this.logError(err, { operation });

		// Provide user-friendly error messages
		if (err.message?.includes('insufficient resources')) {
			return { success: false, error: 'Not enough resources to complete this action.' };
		}

		if (err.message?.includes('building queue full')) {
			return {
				success: false,
				error: 'Building queue is full. Please wait for current constructions to complete.'
			};
		}

		if (err.message?.includes('research lab required')) {
			return { success: false, error: 'You need a Research Lab to conduct research.' };
		}

		if (err.message?.includes('prerequisites not met')) {
			return { success: false, error: 'Prerequisites not met for this action.' };
		}

		// Generic error
		return { success: false, error: 'An unexpected error occurred. Please try again.' };
	}

	static handleDatabaseError(error: unknown, operation: string) {
		const err = error instanceof Error ? error : new Error(String(error));
		this.logError(err, { operation, type: 'database' });

		// Handle specific database errors
		const dbError = error as { code?: string };
		if (dbError.code === '23505') {
			// Unique constraint violation
			throw new Error('This action would create a duplicate entry.');
		}

		if (dbError.code === '23503') {
			// Foreign key constraint violation
			throw new Error('Referenced data does not exist.');
		}

		if (dbError.code === '23514') {
			// Check constraint violation
			throw new Error('Data validation failed.');
		}

		// Re-throw the error
		throw error;
	}

	static async withTransaction<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
		try {
			const result = await operation();
			return result;
		} catch (error) {
			const err = error instanceof Error ? error : new Error(String(error));
			this.logError(err, { operation: operationName, type: 'transaction' });
			throw error;
		}
	}

	static logUserAction(userId: number, action: string, details?: unknown) {
		const logEntry = {
			timestamp: new Date().toISOString(),
			userId,
			action,
			details
		};

		if (dev) {
			console.log('User Action:', logEntry);
		} else {
			// In production, store in database or send to logging service
			console.log('User Action:', logEntry);
		}
	}

	static logPerformance(operation: string, duration: number, details?: unknown) {
		const logEntry = {
			timestamp: new Date().toISOString(),
			operation,
			duration,
			details
		};

		if (duration > 1000) {
			// Log slow operations
			console.warn('Slow Operation:', logEntry);
		} else if (dev) {
			console.log('Performance:', logEntry);
		}
	}
}

// Performance monitoring decorator
export function withPerformanceLogging(operationName: string) {
	return function (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: unknown[]) {
			const start = Date.now();
			try {
				const result = await originalMethod.apply(this, args);
				const duration = Date.now() - start;
				ErrorHandler.logPerformance(operationName, duration);
				return result;
			} catch (error) {
				const duration = Date.now() - start;
				ErrorHandler.logPerformance(`${operationName}_failed`, duration);
				throw error;
			}
		};

		return descriptor;
	};
}
