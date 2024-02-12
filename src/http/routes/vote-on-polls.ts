import { randomUUID } from 'crypto';
import { FastifyInstance } from 'fastify';
import z from 'zod';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { voting } from '../../utils/voting-pub-sub';

export async function voteOnPolls(app: FastifyInstance) {
	app.post('/polls/:pollId/votes', async (request, reply) => {
		const voteOnPollBody = z.object({
			pollOptionId: z.string().uuid(),
		});

		const voteOnPollParams = z.object({
			pollId: z.string().uuid(),
		});

		const { pollId } = voteOnPollParams.parse(request.params);
		const { pollOptionId } = voteOnPollBody.parse(request.body);

		let { sessionId } = request.cookies;

		if (sessionId) {
			const userPreviousVoteOnPoll = await prisma.vote.findUnique({
				where: {
					sessionId_pollId: {
						pollId,
						sessionId,
					},
				},
			});

			if (
				userPreviousVoteOnPoll &&
				userPreviousVoteOnPoll.pollOptionId !== pollOptionId
			) {
				await prisma.vote.delete({
					where: {
						id: userPreviousVoteOnPoll.id,
					},
				});

				const votes = await redis.zincrby(
					pollId,
					-1,
					userPreviousVoteOnPoll.pollOptionId,
				);

				voting.publish(pollId, {
					pollOptionId: userPreviousVoteOnPoll.pollOptionId,
					votes: Number(votes),
				});
			} else if (userPreviousVoteOnPoll) {
				return reply
					.status(400)
					.send({ message: 'User already voted on this poll' });
			}
		}

		if (!sessionId) {
			sessionId = randomUUID();

			reply.setCookie('sessionId', sessionId, {
				path: '/',
				maxAge: 60 * 60 * 24 * 30, // 30 days
				signed: true,
				httpOnly: true,
			});
		}

		await prisma.vote.create({
			data: {
				sessionId,
				pollOptionId,
				pollId,
			},
		});

		// Increases by 1 the option inside the poll
		const votes = await redis.zincrby(pollId, 1, pollOptionId);

		voting.publish(pollId, {
			pollOptionId,
			votes: Number(votes),
		});

		return reply.status(201).send({ message: 'Vote registered' });
	});
}
