# bun-dynamic-routes

> This project is provided as a GitHub template repository, enabling you to quickly clone and start building your application without spending excessive time on bootstrapping. The template includes a pre-configured setup with a powerful `Route Loader` and `Logger`, allowing you to focus directly on creating your route handlers and application logic.

### About Bun

Bun is a modern JavaScript runtime, package manager, and toolkit designed to provide a faster and more efficient alternative to Node.js. Here's a concise summary of Bun and its potential benefits for API and application server development:

1. Performance: Bun is built on the JavaScriptCore engine, offering significantly faster startup times and execution than Node.js.
2. Built-in features: It includes a package manager, test runner, and bundler out of the box, simplifying the development workflow.
3. TypeScript support: Native TypeScript support without requiring separate compilation steps.
4. API compatibility: High compatibility with Node.js and Web APIs makes migration easier.
5. Hot reloading: Built-in support for hot module replacement, improving developer experience.
6. SQLite support: Native SQLite database integration, useful for many applications.
7. Web standard APIs: Implementation of standard Web APIs, allowing for easier code sharing between server and client.
8. Resource efficiency: Lower memory usage compared to Node.js, potentially reducing infrastructure costs.

### Dynamic Route Loader

The Route Loader functionality implemented in this project offers a highly efficient and automated approach to managing routes in a Hono web application. For developers, this significantly reduces manual effort in setting up and maintaining route configurations. By dynamically discovering and loading route handlers from the filesystem, the Route Loader ensures that the application can seamlessly integrate new routes as they are added, without requiring manual updates to the routing logic. This saves time and minimizes the potential for human error, ensuring that all routes are consistently and correctly configured.

One of the key advantages of this Route Loader is its ability to handle both regular HTTP and WebSocket routes. This dual capability is particularly beneficial for modern web applications requiring real-time communication features. The Route Loader's logic to distinguish between different route types and appropriately set up WebSocket connections demonstrates its robustness and flexibility. Developers can simply create their route handler files, and the Route Loader will take care of the rest, ensuring that the correct routes are mounted with the necessary configurations.

Using asynchronous operations and dynamic imports in the Route Loader enhances its efficiency and scalability. Asynchronous file system operations prevent blocking the main execution thread, ensuring that the application remains responsive even when loading a large number of routes. Dynamic imports allow for loading route modules only when needed, improving the application's startup time and reducing memory consumption. This efficient resource management is crucial for maintaining high performance in web applications, especially those that handle significant traffic.

Moreover, the Route Loader's recursive directory traversal allows for a well-organized and modular file structure. Developers can organize route handlers in a nested directory structure that mirrors the application's URL hierarchy. This organization makes the codebase more manageable and easier to navigate and aligns with best practices for scalable web application development. As the application grows, developers can easily locate and update specific route handlers without wading through a monolithic codebase.

### Folder Structure

API route method handler directly mirrors your URL path. Here's how you can organize your `routes` folder to align with your URL paths and methods:

```
routes/
├── echo/
│   └── post.ts
├── users/
│   ├── post.ts
│   ├── $id/
│   │   └── tasks/
│   │       ├── post.ts
│   │       └── $task/
│   │           └── post.ts
└── api/
    ├── echo/
    │   └── post.ts
    ├── users/
    │   ├── post.ts
    │   ├── $id/
    │   │   └── tasks/
    │   │       ├── post.ts
    │   │       └── $task/
    │   │           └── post.ts
```

### Explanation:

1. **Root Routes**:
   - `routes/`: Base folder for all routes.
   - `routes/api/`: Base folder for API routes.
2. **Echo Route**:
   - `routes/api/echo/post.ts`: Handles the `POST /api/echo` endpoint.
3. **User Routes**:
   - `routes/api/users/post.ts`: Handles the `POST /api/users` endpoint.
   - `routes/api/users/$id/tasks/post.ts`: Handles the `POST /api/users/:id/tasks` endpoint.
   - `routes/api/users/$id/tasks/$task/post.ts`: Handles the `POST /api/users/:id/tasks/:task` endpoint.

### Benefits:

- **Direct Mapping**: This structure ensures that the file path of your API route method handler mirrors your URL path, making it intuitive to locate and manage route handlers.
- **Consistency**: All routes are organized under the `routes/api` directory, providing a clear and consistent structure.
- **Scalability**: Easily extendable by adding new folders and files as new routes are introduced.

### Example Mapping:

| **API endpoint**        | **Handler**                                |
| ----------------------- | ------------------------------------------ |
| POST /api/echo          | `routes/api/echo/post.ts`                  |
| POST /api/users         | `routes/api/users/post.ts`                 |
| POST /api/users//tasks  | `routes/api/users/$id/tasks/post.ts`       |
| POST /api/users//tasks/ | `routes/api/users/$id/tasks/$task/post.ts` |

This structure simplifies the process of adding new routes and ensures that the relationship between URL paths and file paths is clear and maintainable.

### Parametrized path

**Parameterized Paths**:

- Parameterized paths allow you to define dynamic segments in your URL, which can be used to capture values from the URL and use them within your route handlers.
- In the context of your file structure, parameterized paths are represented by folder names enclosed in special characters (e.g., `$id`, `$task`).

**Folder Naming Conventions**:

- Use a consistent naming convention for parameterized folders to clearly indicate that these segments are dynamic.
- Common practices include using dollar signs (`$id`) or square brackets (`[id]`). For your structure, `$id` and `$task` are used.

**Dynamic Segments in URL**:

- When defining a URL path with dynamic segments, the route loader should be able to correctly parse these segments and map them to the corresponding folder and file structure.
- Example: For the URL `/api/users/:id/tasks/:task`, the corresponding file structure would be `routes/api/users/$id/tasks/$task/post.ts`.

**Accessing Parameters in Handlers**:

- Within your route handler files, you can access the values of these parameters (e.g., `id` and `task`) through the request object provided by your framework.
- Ensure your route handler logic properly extracts and uses these parameters to handle requests dynamically.

**Consistency and Scalability**:

- Maintaining a consistent structure for parameterized paths helps in easily locating route handlers.
- This approach also supports scalability, allowing you to add more dynamic segments as needed without altering the core structure.

### Example with Parameterized Paths:

`POST /api/users/:id/tasks/:task`

**Folder Structure**:

```
routes/
└── api/
    └── users/
        └── $id/
            └── tasks/
                └── $task/
                    └── post.ts
```

**Handler File: `routes/api/users/$id/tasks/$task/post.ts`**:

```typescript
import { Context } from 'hono';

export default (c: Context) => {
  const userId = c.req.param('id');
  const taskId = c.req.param('task');
  
  // Logic to handle the request using userId and taskId
  return c.json({ message: `Handling task ${taskId} for user ${userId}` });
};
```

### Key Takeaways:

- **Parameterized folders** clearly represent dynamic URL segments, making it easier to manage and navigate your routes.
- **Consistent naming conventions** ensure that all developers on the project understand and follow the same structure.
- **Dynamic route handling** within your handler files makes it easy to work with URL parameters, improving code readability and maintainability.

### Adding WebSockets

For WebSocket routes, add a `ws.ts` file in the appropriate directory to handle WebSocket connections.

```
routes/
└── api/
    └── chat/
        └── ws.ts
```

So the whole project's `routes` folder can look like this:

```
routes/
├── echo/
│   └── post.ts
├── users/
│   ├── post.ts
│   ├── $id/
│   │   └── tasks/
│   │       ├── post.ts
│   │       └── $task/
│   │           └── post.ts
├── auth/
│   ├── login/
│   │   └── post.ts
│   ├── logout/
│   │   └── post.ts
│   └── register/
│       └── post.ts
└── chat/
    └── ws.ts
```

### Explanation

- **HTTP Routes**:
  - Place HTTP route handlers in directories corresponding to their URL paths.
  - Use filenames like `post.ts`, `get.ts`, etc., to specify the HTTP method.
- **WebSocket Routes**:
  - Use `ws.ts` to denote WebSocket route handlers.
  - The folder name should correspond to the URL path of the WebSocket endpoint.

### Notes on WebSocket Route Parameters

1. **Parameterized Paths for WebSockets**:
   - Similar to HTTP routes, WebSocket routes can also use parameterized paths to capture dynamic values from the URL.
   - These parameters can be accessed within the WebSocket handler to customize the behavior based on the URL segments.
2. **Accessing Parameters in WebSocket Handlers**:
   - In a WebSocket handler file (e.g., `ws.ts`), you can access path parameters using the context object provided by the framework.
   - Use `context.req.param()` to retrieve the dynamic segments from the URL.
3. **Example with Parameterized WebSocket Path**:
   - For a WebSocket route defined as `/api/:assistantId/ws`, the corresponding file structure would include a parameterized folder, such as `$assistantId`.

### Example with WebSocket Route and Parameters

`GET /api/:assistantId/ws`

**Folder Structure**:

```
routes/
└── api/
    └── $assistantId/
        └── ws.ts
```

**Handler File: `routes/api/$assistantId/ws.ts`**:

```typescript
import { type Context } from 'hono';

export default async (c: Context) => {
    const { assistantId } = c.req.param();

    return {
        onOpen: (event: any, ws: any) => {
            ws.send(`Hello, assistant ${assistantId}!`);
        },
        onMessage: (event: any) => {
            console.log(`Message from assistant ${assistantId}: ${event.data}`);
        }
    };
};
```

### Key Points:

1. **Parameterized Folder Names**:
   - Use folder names like `$assistantId` to indicate dynamic segments in the URL.
   - This approach ensures the route loader correctly parses and mounts the WebSocket route with the dynamic path.
2. **Accessing Path Parameters**:
   - Within the WebSocket handler (`ws.ts`), access the path parameters using the `context.req.param()` method.
   - This allows you to use values like `assistantId` to customize responses and behavior based on the URL.
3. **Consistent Parameter Handling**:
   - By following the same conventions for both HTTP and WebSocket routes, your codebase remains consistent and easy to understand.
   - Developers can expect the same methods and patterns for accessing parameters across different types of routes.

### Logger

The `Logger` class is a robust, flexible logging utility tailored to Bun-driven applications. It supports multiple log levels, customizable output formats, and dynamic method creation for each log level, making it easy to use and configure. Integrating environment variables allows for adaptable logging behavior based on deployment configurations, ensuring that it can fit a variety of use cases and environments.

### Example Usage

```typescript
const logger = new Logger('RouteLoader');

// Log at different levels
logger.info('This is an informational message');
logger.error('An error occurred', { errorDetails: 'Error details here' });
```

Using this structured and configurable logging approach, developers can ensure their applications have consistent and meaningful log output, aiding debugging and monitoring efforts. 

### Logger Output Formats and Formatting

The `Logger` class supports customizable output formats, allowing developers to choose between text and JSON formats and configure the log fields' order and content. This flexibility is crucial for integrating with various logging systems and meeting specific requirements of different environments and applications.

#### Output Formats

1. **Text Format**:
   - The default output format is text.
   - Log messages are formatted as human-readable strings, following a customizable pattern.
2. **JSON Format**:
   - Alternatively, logs can be output in JSON format.
   - JSON format is useful for structured logging, making parse and analyze logs programmatically easier.

#### Formatting Log Output

The Logger class allows extensive customization of the log output format through the format option when using text format. By default, the format is set to `'{timestamp} [{level}] {context}: {message}'`. However, this can be customized as needed.

##### **Changing the Order of Fields**

By modifying the format string, you can change the order of fields and include additional information in the log format. The following placeholders are available for use in the format string:

- `{timestamp}`: The time when the log entry was created.
- `{host}`: The machine's hostname where the log entry was created.
- `{level}`: The log level (e.g., TRACE, DEBUG, INFO).
- `{context}`: The context in which the logger is used.
- `{message}`: The log message.
- `{...args}`: Any additional arguments passed to the logger.

### Example Customization

#### Text Format Example

**Default Format**:

```typescript
const logger = new Logger('RouteLoader', {
    format: '{timestamp} [{level}] {context}: {message}'
});

logger.info('This is an informational message');
```

**Output**:

```
2024-06-21 10:00:00 [INFO] RouteLoader: This is an informational message
```

**Custom Format**:

```typescript
const logger = new Logger('RouteLoader', {
    format: '{level} - {timestamp} - {context} - {message}'
});

logger.info('This is an informational message');
```

**Output**:

```
INFO - 2024-06-21 10:00:00 - RouteLoader - This is an informational message
```



## Running the project

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run src/index.ts
```

Or, if you have [Task](https://taskfile.dev/) installed:

```shell
task dev
```

