# TurboEureka

## What is it?

TurboEureka is a racing game in the style of the Mode7 racers on the SNES such as F-Zero, Mario Kart, and Street Racer. The game is built with raw web components apis and no libraries or frameworks. Since the game is built with web components, players can customize the cars and tracks using only web technologies.


## Getting Started

To get started, click the "Start Game" button below. The game will load and you can start racing. The game is still in development so there may be bugs and missing features.

<button id="start-game">Start Game</button>

## The World

The world is composed of a ground, some number of obstacles, a sky, and some number of karts. The kart remains mostly centered on the screen, while the track. The track is a 2D plane that is rotated and scaled to simulate a 3D track. The sky is a background behind it that uses paralax scrolling to simulate rotation. The karts and obstacles are sprites placed in the correct location on the ground to simulate 3D position. As the player's kart moves around the ground, the world keeps the kart in the center while rotating, scaling and translating the ground to approximate a position on the track.

## Grounds

Grounds are composed of a ground texture and a ground track path. These can be provided to the Ground component using the groundtexture slot, and the groundcollision slot. The ground collision is provided as an SVG vector.

## Skies

Skies are a paralax scrolling and repeating pattern that can be placed behind a subject to simulate rotation.

## Karts

Karts are composed of a kart body and a kart wheels. These can be provided to the Kart component using the kartbody slot, and the kartwheel slot.

## Obstacles

Obstacles are Matter.js Bodies that are placed on the track to provide a challenge to the player. The obstacles are placed on the track using the Obstacle component.

## Controls

The controls fall back to keyboard; A and D keys, as well as left and right keys for steering, W for gas, and S for brake. However, if you have a controller connected and you press a button a menu will appear that asks you to chose the function of each button on your controller. The controls are managed by the Game element. Also there will be touch controls.

## Getting Started

Install dependencies by running `npm install`, then start the development server with `npm start`.
