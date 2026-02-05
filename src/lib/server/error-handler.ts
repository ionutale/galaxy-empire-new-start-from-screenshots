import { dev } from '$app/environment';

export class ErrorHandler {
	private static logError(error: Error, context?: any) {
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

	static handleApiError(error: any, operation: string): { success: false; error: string } {
		this.logError(error, { operation });

		// Provide user-friendly error messages
		if (error.message?.includes('insufficient resources')) {
			return { success: false, error: 'Not enough resources to complete this action.' };
		}

		if (error.message?.includes('building queue full')) {
			return {
				success: false,
				error: 'Building queue is full. Please wait for current constructions to complete.'
			};
		}

		if (error.message?.includes('research lab required')) {
			return { success: false, error: 'You need a Research Lab to conduct research.' };
		}

		if (error.message?.includes('prerequisites not met')) {
			return { success: false, error: 'Prerequisites not met for this action.' };
		}

		// Generic error
		return { success: false, error: 'An unexpected error occurred. Please try again.' };
	}

	static handleDatabaseError(error: any, operation: string) {
		this.logError(error, { operation, type: 'database' });

		// Handle specific database errors
		if (error.code === '23505') {
			// Unique constraint violation
			throw new Error('This action would create a duplicate entry.');
		}

		if (error.code === '23503') {
			// Foreign key constraint violation
			throw new Error('Referenced data does not exist.');
		}

		if (error.code === '23514') {
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
			this.logError(error as Error, { operation: operationName, type: 'transaction' });
			throw error;
		}
	}

	static logUserAction(userId: number, action: string, details?: any) {
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

	static logPerformance(operation: string, duration: number, details?: any) {
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
	return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = async function (...args: any[]) {
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
