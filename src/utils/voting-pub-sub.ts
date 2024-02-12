// PubSub is a class that allows us to publish and subscribe to messages. We can
// use it to broadcast messages to all connected clients.
// All messages are sent to a specific channel, which is the poll ID. This way,
// we can broadcast the poll results to the correct channel and only to the
// clients that are subscribed to that channel.

type Message = { pollOptionId: string; votes: number };
type Subscriber = (message: Message) => void;

class VotingPubSub {
	private channels: Record<string, Subscriber[]> = {};

	subscribe(pollId: string, subscriber: Subscriber) {
		if (!this.channels[pollId]) {
			this.channels[pollId] = [];
		}
		this.channels[pollId].push(subscriber);
	}

	publish(pollId: string, message: Message) {
		if (!this.channels[pollId]) return;

		for (const subscriber of this.channels[pollId]) {
			subscriber(message);
		}
	}
}

export const voting = new VotingPubSub();
