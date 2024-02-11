import cookie from '@fastify/cookie';
import fastify from 'fastify';
import { createPoll } from './routes/create-poll';
import { getPoll } from './routes/get-poll';
import { voteOnPolls } from './routes/vote-on-polls';

const app = fastify();

app.register(cookie, {
	secret: 'polls-app-nlw',
	hook: 'onRequest',
});

app.register(createPoll);
app.register(getPoll);
app.register(voteOnPolls);

app.listen({ port: 3333 }).then(() => {
	console.log('HTTP Server is running on port 3333');
});
