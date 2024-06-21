const merge = (obj1: any, obj2: any): any =>
{
    let output = {...obj1};

    for (const [key, value] of Object.entries(obj2))
    {
        if (typeof value === 'object' && value !== null && !Array.isArray(value) && obj1.hasOwnProperty(key) && typeof obj1[key] === 'object')
        {
            output[key] = merge(obj1[key], obj2[key]);
        }
        else
        {
            output[key] = obj2[key];
        }
    }

    return output;
};

export default merge;
