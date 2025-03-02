import {type Context} from 'hono';
import Layout from '@/components/Layout';
import Header from '@/components/Header';

export default async ({html}: Context) =>
    html(<Layout title={"My app"}>
        <Header></Header>
    </Layout>)