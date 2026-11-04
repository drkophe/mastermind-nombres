'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { RoomManager } = require('../../server/codenames/rooms');
const { ChatService } = require('../../server/codenames/chat');
const { FakeScheduler } = require('./helpers');

function setup(settings) {
  const scheduler = new FakeScheduler();
  const manager = new RoomManager({ scheduler });
  const chat = new ChatService({ scheduler });
  const room = manager.createRoom({ playerId: 'r1', name: 'R1' }, { settings });
  return { scheduler, manager, chat, room };
}

test('chat général : tout le monde, spectateurs compris', () => {
  const { manager, chat, room } = setup();
  manager.join(room.id, { playerId: 'b1', name: 'B1' });
  manager.join(room.id, { playerId: 's', name: 'S' }, { asSpectator: true });
  const { recipients } = chat.post(room, room.members.get('s'), 'general', 'bonjour');
  assert.deepEqual(recipients.map((m) => m.id).sort(), ['b1', 'r1', 's']);
});

test('chat d\'équipe Classique : uniquement l\'équipe, capitaine inclus', () => {
  const { manager, chat, room } = setup();
  ['b1', 'r2', 'b2'].forEach((id) => manager.join(room.id, { playerId: id, name: id }));
  manager.join(room.id, { playerId: 's', name: 'S' }, { asSpectator: true });
  manager.assign(room.id, 'r1', 'r1', { team: 'rouge', role: 'capitaine' });
  manager.assign(room.id, 'r1', 'r2', { team: 'rouge', role: 'agent' });
  manager.assign(room.id, 'r1', 'b1', { team: 'bleu', role: 'agent' });
  manager.assign(room.id, 'r1', 'b2', { team: 'bleu', role: 'capitaine' });
  const { recipients, message } = chat.post(room, room.members.get('r2'), 'equipe', 'je pense à CHAT');
  assert.deepEqual(recipients.map((m) => m.id).sort(), ['r1', 'r2']);
  assert.equal(message.team, 'rouge');
  assert.equal(chat.historyFor(room, room.members.get('b1')).equipe.length, 0);
  assert.equal(chat.historyFor(room, room.members.get('s')).equipe.length, 0);
  assert.equal(chat.historyFor(room, room.members.get('r1')).equipe.length, 1);
});

test('les spectateurs n\'ont pas de chat d\'équipe', () => {
  const { manager, chat, room } = setup();
  manager.join(room.id, { playerId: 's', name: 'S' }, { asSpectator: true });
  assert.throws(() => chat.post(room, room.members.get('s'), 'equipe', 'coucou'), /chat d'équipe/);
});

test('Duo : chat privé entre les deux joueurs', () => {
  const { manager, chat, room } = setup({ mode: 'duo' });
  manager.join(room.id, { playerId: 'b1', name: 'B1' });
  manager.join(room.id, { playerId: 's', name: 'S' }, { asSpectator: true });
  const { recipients } = chat.post(room, room.members.get('b1'), 'equipe', 'secret');
  assert.deepEqual(recipients.map((m) => m.id).sort(), ['b1', 'r1']);
});

test('protections : longueur maximale, message vide, anti-flood', () => {
  const { chat, room, scheduler } = setup();
  const member = room.members.get('r1');
  const { message } = chat.post(room, member, 'general', 'x'.repeat(1000));
  assert.equal(message.text.length, 300);
  assert.throws(() => chat.post(room, member, 'general', '   '), /vide/);
  assert.throws(() => chat.post(room, member, 'general', 'trop vite'), /Doucement/);
  for (let i = 0; i < 5; i++) {
    scheduler.advance(500);
    chat.post(room, member, 'general', `m${i}`);
  }
  scheduler.advance(500);
  assert.throws(() => chat.post(room, member, 'general', 'flood'), /Trop de messages/);
  scheduler.advance(10_000);
  chat.post(room, member, 'general', 'ça repart');
});

test('le texte est conservé brut (échappé à l\'affichage via textContent)', () => {
  const { chat, room } = setup();
  const { message } = chat.post(room, room.members.get('r1'), 'general', '<img src=x onerror=alert(1)>');
  assert.equal(message.text, '<img src=x onerror=alert(1)>');
});
