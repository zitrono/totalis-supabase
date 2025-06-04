#!/usr/bin/env node

import { Command } from 'commander';
import { TotalisTestClient } from './index';
import { runAllScenarios } from './scenarios';
import { runNewUserScenario } from './scenarios/new-user.scenario';
import { runCategoryCheckInScenario } from './scenarios/category-checkin.scenario';
import { runChatInteractionScenario } from './scenarios/chat-interaction.scenario';
import { runAbortCheckInScenario } from './scenarios/abort-checkin.scenario';
import { runAudioUploadScenario } from './scenarios/audio-upload.scenario';

const program = new Command();
const client = new TotalisTestClient();

program
  .name('totalis-test-client')
  .description('Test client for Totalis Supabase migration')
  .version('1.0.0');

program
  .command('run-all')
  .description('Run all test scenarios')
  .action(async () => {
    try {
      await runAllScenarios(client);
      process.exit(0);
    } catch (error) {
      console.error('Error running scenarios:', error);
      process.exit(1);
    }
  });

program
  .command('new-user')
  .description('Run new user scenario')
  .action(async () => {
    try {
      await runNewUserScenario(client);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('chat')
  .description('Run chat interaction scenario')
  .action(async () => {
    try {
      await runChatInteractionScenario(client);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('category-checkin')
  .description('Run category check-in scenario')
  .action(async () => {
    try {
      await runCategoryCheckInScenario(client);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('abort-checkin')
  .description('Run abort check-in scenario')
  .action(async () => {
    try {
      await runAbortCheckInScenario(client);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('audio')
  .description('Run audio upload scenario')
  .action(async () => {
    try {
      await runAudioUploadScenario(client);
      process.exit(0);
    } catch (error) {
      console.error('Error:', error);
      process.exit(1);
    }
  });

program
  .command('interactive')
  .description('Run interactive test session')
  .action(async () => {
    console.log('🔧 Interactive Test Client');
    console.log('This feature allows manual testing of specific functionality.');
    console.log('Use the exported client instance to test individual methods.\n');
    
    // Create a simple REPL-like environment
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: 'test> '
    });

    console.log('Available commands:');
    console.log('  auth - Sign in anonymously');
    console.log('  profile - Create/get user profile');
    console.log('  chat <message> - Send a chat message');
    console.log('  checkin - Start a check-in');
    console.log('  cards - Get active cards');
    console.log('  categories - List all categories');
    console.log('  audio - Upload and transcribe audio');
    console.log('  transcriptions - List transcription history');
    console.log('  exit - Exit interactive mode\n');

    rl.prompt();

    rl.on('line', async (line: string) => {
      const [command, ...args] = line.trim().split(' ');

      try {
        switch (command) {
          case 'auth':
            const auth = await client.signInWithEmail('test1@totalis.app', 'Test123!@#');
            console.log('✓ Signed in:', auth.user.id);
            break;

          case 'profile':
            let profile = await client.getUserProfile();
            if (!profile) {
              profile = await client.createUserProfile({
                name: 'Interactive Test User',
                dateOfBirth: new Date('1985-05-15'),
                sex: 'other'
              });
              console.log('✓ Profile created:', profile.name);
            } else {
              console.log('✓ Profile exists:', profile.name);
            }
            break;

          case 'chat':
            const message = args.join(' ');
            if (!message) {
              console.log('Usage: chat <message>');
            } else {
              await client.sendMessage(message);
              console.log('✓ Message sent');
              setTimeout(async () => {
                const messages = await client.getMessages(2);
                const lastMessage = messages[messages.length - 1];
                console.log('AI:', lastMessage.content);
                rl.prompt();
              }, 2000);
              return;
            }
            break;

          case 'checkin':
            const checkIn = await client.startCheckIn();
            console.log(`✓ Check-in started with ${checkIn.questions.length} questions`);
            break;

          case 'cards':
            const cards = await client.getActiveCards();
            console.log(`✓ Active cards: ${cards.length}`);
            cards.slice(0, 3).forEach(card => {
              console.log(`  - ${card.title}`);
            });
            break;

          case 'categories':
            const categories = await client.getAllCategories();
            console.log(`✓ Categories: ${categories.length}`);
            categories.slice(0, 5).forEach(cat => {
              console.log(`  - ${cat.name}`);
            });
            break;

          case 'exit':
            rl.close();
            return;

          default:
            console.log('Unknown command. Type "exit" to quit.');
        }
      } catch (error) {
        console.error('Error:', error);
      }

      rl.prompt();
    });

    rl.on('close', () => {
      console.log('\nGoodbye!');
      process.exit(0);
    });
  });

program.parse();