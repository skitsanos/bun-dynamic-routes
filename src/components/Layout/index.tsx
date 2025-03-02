import {type CSSProperties, type FC, type PropsWithChildren} from 'hono/jsx';

interface LayoutProps
{
    title: string;
    description?: string,
    keywords?: string,
    url: string,
    // styles
    bodyClass: string,
    style?: CSSProperties
}

const Layout: FC = ({
                        title,
                        description,
                        keywords,
                        children,
                        url
                    }: PropsWithChildren<LayoutProps>) =>
{
    return <html lang="en">
    <head>
        <meta charSet="utf-8"/>
        <meta content="width=device-width, initial-scale=1.0"
              name="viewport"/>

        <title>{title}</title>
        {description && <meta name={'description'}
                              content={description}/>}
        {keywords && <meta name={'keywords'}
                           content={keywords}/>}

        {/*Open Graph / Facebook Meta tags*/}
        <meta property={'og:type'}
              content={'website'}/>
        <meta property={'og:title'}
              content={title}/>

        <meta property={'og:title'}
              content={title}/>
        <meta property={'og:url'}
              content={url}/>
        <meta property={'og:description'}
              content={description}/>
    </head>
    <body>
    <h1>{title}</h1>
    {children}

    <code>
        You can modify this layout in <code>src/components/Layout/index.tsx</code>
    </code>
    </body>
    </html>;
};

export default Layout;