import { dispatchDueAutomatedReminders, generateAutomatedReminders } from '../src/lib/reminders';

async function main() {
  const generation = await generateAutomatedReminders();
  const dispatch = await dispatchDueAutomatedReminders(100);

  console.log(
    JSON.stringify(
      {
        generated: generation.generated,
        dispatched: dispatch.dispatched,
        queued: dispatch.queued,
      },
      null,
      2,
    ),
  );
}

void main().catch((error) => {
  console.error('Failed to run reminders', error);
  process.exit(1);
});
