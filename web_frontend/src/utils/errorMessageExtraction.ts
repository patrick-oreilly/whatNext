export function extractErrorMessage(e: unknown): string {
    if (e instanceof Error)
        return e.message;

    if (typeof e === 'string')
        return e;

    if (typeof e === 'object' && e !== null) {
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const maybeError = e as Record<string, any>;

        if (maybeError.response?.data?.detail)
            return maybeError.response.data.detail;
        if (typeof maybeError.message === 'string')
            return maybeError.message;
    }
    return 'Failed to join room'
}