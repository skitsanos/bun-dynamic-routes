const response = {
    error: (code: number, message: string) => ({error: {code, message}}),
    result: <T>(data: T) => ({result: data})
};

export default response;