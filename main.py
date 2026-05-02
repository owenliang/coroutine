'''
Python has native support for coroutines.
'''
import asyncio

'''
[cancel_demo]
task starts
task cancelled
'''
async def cancel_demo() -> None:
    async def run_task() -> None:
        print('task starts')
        await asyncio.sleep(5)
        print('task ends')

    task=asyncio.create_task(run_task())
    await asyncio.sleep(1)
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        print('task cancelled')

'''
[concurrent_demo]
task starts
event waiting
event set
wait_event done
run_task cancelled
'''
async def concurrent_demo() -> None:
    async def run_task() -> None:
        print('task starts')
        await asyncio.sleep(5)
        print('task ends')

    event = asyncio.Event()
    async def wait_event() -> None:
        print('event waiting')
        await event.wait()
        print('event set')
    async def set_event() -> None:
        await asyncio.sleep(1)
        event.set()

    task1 = asyncio.create_task(run_task(),name='run_task')
    task2 = asyncio.create_task(wait_event(),name='wait_event')
    asyncio.create_task(set_event())

    done,pending=await asyncio.wait([task1,task2],return_when=asyncio.FIRST_COMPLETED)
    for task in done:
        print(f'{task.get_name()} done')
    for task in pending:
        task.cancel()
        try:
            await task 
        except:
            print(f'{task.get_name()} cancelled')

async def main() -> None:
    print('[cancel_demo]')
    await cancel_demo()
    print('[concurrent_demo]')
    await concurrent_demo()

if __name__ == "__main__":
    asyncio.run(main())