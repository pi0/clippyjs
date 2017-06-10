var availableAgents = ['Bonzi', 'Clippy', 'F1', 'Genie', 'Genius', 'Links', 'Merlin', 'Peedy', 'Rocky', 'Rover']

var talks = [
    'How can i help you?',
    'Nice day!',
    'Glad to meet you.',
    'At your service',
    'Helloo'
]

const randPos = () => .2 + Math.random() * .6

function nextAgent () {
    let agentName = availableAgents.pop()
    if (!agentName) return;

    clippy.load(agentName, agent => {
        window[agentName] = agent

        const move = () => {
            agent.moveTo($(document).width() * randPos(), $(document).height() * randPos())
        }

        move()

        agent.show();

        // Speak on click and start
        const speak = () => {
            agent.speak('I am ' + agentName + ', ' + talks[~~(Math.random() * talks.length)])
            agent.animate()
        }
        $(agent._el).click(() => speak())
        speak()

        // Animate randomly
        setInterval(() => {
            agent.animate()
        }, 3000 + (Math.random() * 4000))

        // Move randomly
        setInterval(() => {
            move()
        }, 3000 + (Math.random() * 4000))

        setTimeout(nextAgent, 2000)
    });
}

nextAgent()