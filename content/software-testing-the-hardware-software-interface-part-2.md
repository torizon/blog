---
title: "Embedded Software Testing: Practical Continuous Integration with Hardware in the Loop (Part 2)"
date: 2024-11-03
author: Leonardo Held, Torizon Developer
draft: false

tags: ["Testing", "Embedded", "Linux", "Embedded"]

abstract: A series about Embedded Software Testing.

image: /soave-gate.jpg
---

This is the second installment in the embedded software testing series. This one will be about the architecture of a 
system to test embedded software. I'll give you a practical example of a test for an Embedded Device with integration to
a CI/CD system. We'll briefly cover what is usually called a "dual-targeting" approach as well.

## Theory

In the previous installment we talked about the different levels of software testing, and the last one was "end-to-end
testing", which is treating the Device Under Test (DUT) like a black box, poking it with a certain stimuli
(inputs), seeing how it reacts (output) and comparing with a known expected value.

So essentially we need something to actually do the poking, watch the outputs and compare with the known good values.
Practically speaking though, that's hooking up UARTs, displays and whatever else to an embedded system and writing some
software to do that automatically for us.

```text
+--------------------+             +-----------------------+
|                    |             |                       |
|  Testing Software  |             |   Device Under Test   |
|   (Controller)     |             |       (DUT)           |
|                    |             |     [Black Box]       |
|                    |   poking    |                       |
|  - Sends Inputs    | --------->  |  - Processes Inputs   |
|    via UART,       |             |                       |
|    Display, etc.   |             |                       |
|                    |   reacting  |                       |
|  - Receives        | <---------  |  - Generates Outputs  |
|    Outputs         |             |    via UART, etc.     |
|    via UART,       |             |                       |
|    Other I/O       |             |                       |
+--------------------+             +-----------------------+
```

## Practice

### A Simple Testing Architecture

So, as an example let's assume you need to monitor whether your Linux box boots. The manual steps to achieve this are:

1. Reset the board from whatever state it was
2. Wait for the bootloader, kernel and userspace to boot
3. See the login prompt

Great, now we've reduced a requirement (the board must boot) to a set of manual execution steps. But you don't have just
one board, you have around 100 different ones, and every single one of them must be tested every time your Continuous
Integration builds a new OS for the board. Thinking about it in terms of automation, we can reduce this to:

1. Connect the board's UART to a "Controller" - simply put, hooking up the board to a computer
2. Write some software that parses the logs from the UART
3. If it detects our login prompt, consider the boart fully booted

As a practical example, I have a Verdin iMX8MP SoM connected to a Dahlia carrier board. Power is connected as is the
UART to my Controller, which in this case is my computer.

```text
+-------------------+          UART Cable          +------------------------+
|                   | <------------------------->  |                        |
|   Controller      |                              |  Dahlia Carrier Board  |
|   (A Computer)    |                              |  + Verdin iMX8MP SoM   |
|                   |                              |                        |
+-------------------+                              +------------------------+
                                                        |
                                                        |
                                                   +------------+
                                                   |  Power     |
                                                   |  Supply    |
                                                   +------------+
```

> A note on the "Power Supply": I'll assume here a Power Supply (PSU or sometimes PDU for "Power Delivery Unit") will
> always be connected to the board. In reality, PSUs used for this kind of application generally have built-in or
> interface with relays to cut or serve power to devices, and specific software running on the controller is used to
> control how the PSU behaves (for example, boards must be rebooted, or put into recovery mode etc, this can be done from
> a PSU).

### Implementation of a Prompting "Expect" in Python

Then it's a matter of writing some software that runs in the controller and waits for the login prompt.

> You can choose whatever language you feel comfortable with writing tests, but I'd highly suggest looking into either
Python, Perl or Tcl. Interpreted, dynamic languages are generally better for these tasks because you want to chug out
tests quickly. Also, it makes sense to use a language that is familiar to all in your team.  

Wiping up some Python code I got this:

``` python
import unittest
import serial
import time
import xmlrunner


class SerialPromptTest(unittest.TestCase):
    SERIAL_PORT = "/dev/tty.usbserial-110085063"
    BAUD_RATE = 115200
    TIMEOUT = 40
    PROMPT = "verdin-imx8mp-06817296 login:"

    def test_wait_for_PROMPT(self):
        try:
            with serial.Serial(
                self.SERIAL_PORT, self.BAUD_RATE, timeout=self.TIMEOUT
            ) as ser:
                time.sleep(1)
                ser.reset_input_buffer()

                start_time = time.time()
                received_data = ""

                while time.time() - start_time < self.TIMEOUT:
                    if ser.in_waiting > 0:
                        chunk = ser.read(ser.in_waiting).decode(errors="ignore")
                        print(chunk, end="")
                        received_data += chunk

                        if self.PROMPT in received_data:
                            print(f"\nFound expected prompt '{self.PROMPT}'")
                            return
                    else:
                        time.sleep(0.1)

                self.fail(
                    f"Expected prompt '{self.PROMPT}' not found within {self.TIMEOUT} seconds."
                )

        except serial.SerialException as e:
            self.fail(f"Serial connection failed: {e}")


if __name__ == "__main__":
    with open("serial_test_results.xml", "wb") as output:
        unittest.main(
            testRunner=xmlrunner.XMLTestRunner(output=output), exit=False
        )
```

The `test_wait_for_PROMPT` is quite simple and can be reutilized many times. The basic gist is that we keep looking at
data chunks coming from the UART, decoding them and waiting until our desired prompt (`verdin-imx8mp-06817296 login:`)
shows up.

### Human-readable Test Results

Because this function is encapsulated into a module that calls `unittest.main`, it can output the tests results in a
standardized format for us, JUnit.xml, which can be interpreted by many other services such as GitLab, GitHub and others.

> I recommend setting up some visualization of test results early in the process because as you add tests, you will find
> yourself digging through logs and other artifacts instead of just glancing at a screen telling you with tests failed and
> which tests passed. 

Another option is using the handy `junit2html` program, which renders the test results as easily digestible HTML pages
that can be viewed with a web browser.

{{< figure src="/software-testing-part-2-junit2html.png" title="junit2html result of our automated test" alt="" width="140%" class="centered-figure">}}

### De-coupling the Controller the Hardware

The tests we executed might not seem like... a lot, right? But one can easily integrate this further by using `ser2net`,
which takes a serial output and exposes it as a telnet connection for a distributed testing environment.

To use `ser2net` I simply installed on my Debian machine using `apt install ser2net` and I'm running manually with

```text
# ser2net -n -c /etc/ser2net.conf -P /run/ser2net.pid
```

where `/etc/ser2net.conf` contains the following

```text
9000:raw:0:/dev/ttyUSB0:115200 8DATABITS NONE 1STOPBIT
```

With that, from anywhere in the world, I can connect to my Verdin's UART by using telnet. The diagram looks a bit like
this now:

```text
+-------------------+        TCP/IP Connection         +-------------------+
|                   | <----------------------------->  |                   |
|  Testing Software |                                  |    Controller     |
|(running anywhere) |                                  |  (A Computer)     |
|                   |                                  |                   |
+-------------------+                                  |  +-------------+  |
                                                       |  |   ser2net   |  |
                                                       |  +-------------+  |
                                                       +---------|---------+
                                                                 |
                                                           UART Cable
                                                                 |
                                                         +-----------------+
                                                         |                 |
                                                         | Embedded Device |
                                                         | (Dahlia Carrier |
                                                         |  Board + Verdin |
                                                         |   iMX8MP SoM)   |
                                                         |                 |
                                                         +-----------------+
                                                               |
                                                               |
                                                         +------------+
                                                         |   Power    |
                                                         |   Supply   |
                                                         +------------+
```

> ser2net will complain about the old configuration format, but I'm not ready to move to YAML yet. You should!
> ```text
> ser2net:WARNING: Using old config file format, this will go away
> soon.  Please switch to the yaml-based format.
> ```

So, moving over to my other computer, I can grab the IP of the Controller that is running ser2net and modify my
previous testing code a bit to use that telnet connection instead of the local UART:

```python
import unittest
import telnetlib3
import asyncio
import time
import xmlrunner


class TelnetPromptTest(unittest.TestCase):
    TELNET_HOST = "192.168.15.3"
    TELNET_PORT = 9000
    TIMEOUT = 40
    PROMPT = "verdin-imx8mp-06817296 login:"

    async def check_prompt(self):
        reader, writer = await telnetlib3.open_connection(self.TELNET_HOST, self.TELNET_PORT)
        start_time = time.time()
        received_data = ""

        try:
            while time.time() - start_time < self.TIMEOUT:
                chunk = await reader.read(1024)
                if chunk:
                    print(chunk, end="")
                    received_data += chunk

                    if self.PROMPT in received_data:
                        print(f"\nFound expected prompt '{self.PROMPT}'")
                        return True
                else:
                    await asyncio.sleep(0.1)

            self.fail(f"Expected prompt '{self.PROMPT}' not found within {self.TIMEOUT} seconds.")
        finally:
            writer.close()

    def test_wait_for_PROMPT(self):
        asyncio.run(self.check_prompt())


if __name__ == "__main__":
    with open("telnet_test_results.xml", "wb") as output:
        unittest.main(testRunner=xmlrunner.XMLTestRunner(output=output), exit=False)
```

which yields the same results as before.

### Integration with a CI/CD System

Because the script can run anywhere now, integrating everything within a CI/CD systems should be fairly straight forward.
Let's do it with Jenkins, which is a popular and mature CI/CD system. For that, I'll write a simple `Jenkinsfile` that
will execute the tests and parse the results for us:

```groovy
pipeline {
    agent any

    stages {
        stage('Setup') {
            steps {
                echo 'Setting up Python environment'
                sh 'python3 -m venv venv'
                sh '. venv/bin/activate && pip install -r requirements.txt'
            }
        }

        stage('Run Telnet Test') {
            steps {
                echo 'Running Telnet Test'
                sh '. venv/bin/activate && python3 boot-test-telnet.py'
            }
        }
    }

    post {
        always {
            echo 'Cleaning up virtual environment'
            sh 'rm -rf venv'
        }

        success {
            echo 'Tests ran successfully'
        }

        failure {
            echo 'Tests failed, please check the results.'
        }

        unstable {
            junit 'telnet_test_results.xml'
        }
    }
}
```

Which results in this nice CI job that is testing if our Verdin iMX8MP is properly booting! Cool, right?

{{< figure src="/jenkins-result.png" title="Jenkins Pipeline Stages" alt="" width="130%" class="centered-figure">}}


Of course you're free to use CircleCI, GitLab, GitHub whatever other service to do this. But the fact is, if you're
doing Embedded at any scale, this architecture does scale very well.

Having an automated service building and testing your hardware for every new `git push` (CI tools can automatically
trigger jobs after new commits are added or even before during merge requests) allows you to safely push new code faster,
and as I've hinted in the first article, it's more important than ever to safely create new patch releases due to
cybersecurity regulations.

I have to note that during these tests I was manually rebooting the board. Most places hook up the controller to relays
or even other boards so that the controller itself resets and/or flashes the board at the beggining of a test. Notice
that tests should start from *a known state*; if you're testing a software version 7.0.0, that version has to be installed
when running tests.

This pattern of "putting the board into a good state" is generally called Setup, and the process of cleaning up any
mess your test left behind so as to not destroy the capability of a next test to put the board into a new known state is
called Teardown.

### Repeating the Pattern

This example here was quite simple, but it would already be invaluable for any sized project. If you're a contractor,
having tests like this is extremely helpful because you have a way to prove certain criteria were met during the project
development - hard proof that your work was fully completed.

Other more significant tests can simply repeat the pattern: want to test if the busses are working correctly? Hook the
board up to a logic analyzer, the logic analyzer to the Controller and write some logic to test if your software is
properly communicating with the hardware.

A common case we'll talk about in the next installment are GUI validation tests, but as a spoiler you could, for example,
setup a test where a screenshot is taken from within the board, moved over using `scp` to the runner job and use image
comparison techniques to evaluate if the image is being rendered properly. Tests are mostly limited by the ingenuity of
whoever is writing them.

### Dual-targeting with QEMU

Dual-targeting is a technique which involves isolating a given layer (generally the application layer) of a system to
develop and test it further within a second target that is not generally the one actually being deployed.

Why do this? Well, testing with hardware in the loop is quite time consuming. Developing even more so. We want
fast feedback and today a lot is heavily abstracted between the hardware, OS and application layers, meaning if we're
developing an application or a non-hardware-bound kernel feature, we could use something better and faster.

There are a few strategies to do this: let's say you're developing a microcontrolled system where you need to push some
images to a display. At the end of the day what you'll be doing is writing a framebuffer that gets processed by the
display controller: it shouldn't take a long time to develop a visualizer in Javascript or some other high-level language
that ingests in real time the framebuffer written by your custom soon-to-be embedded application and shows something on
the screen. Actually, that's a pretty common thing to do nowadays[^0].

The whole idea is: "how much can I abstract the hardware away so it's easier for me to test code that only contains
business logic?".

For Linux, we're well served with QEMU. Double-targeting to QEMU is specially nice because you can run the exact same
kernel in QEMU if you can use an upstream one. Even better if you only care about the application layer: just target
your Yocto build to a different machine, like `qemuarm64` and you can easily write tests that verify if all the dependencies
for your application are correctly installed - no need for hardware.

Torizon OS also can dual-target fairly easily with Docker. Building Docker Containers for x86 is just a matter of passing
another flag, `--platform linux/amd64`, and quite a few of our customers run applications on their desktop as a development
environment before pushing it to hardware.

To wrap it up, here's an example similar to the one I showed you before, where we made sure our board was properly booting.
This time I built the same exact image, but instead of selecting `MACHINE="verdin-imx8"` on Yocto I chose `MACHINE=qemuarm64`
and launched it as follows:

```bash
qemu-system-aarch64 \
    -M virt \
    -cpu cortex-a72 \
    -m 2048 \
    -nographic \
    -drive if=none,file=torizon-docker-qemuarm64-20241103175530.wic,id=hd0,format=raw \
    -device virtio-blk-device,drive=hd0 \
    -device virtio-net-device,netdev=net0 \
    -netdev user,id=net0,hostfwd=tcp::2223-:22 \
    -bios u-boot.bin \
    -serial pty
```

QEMU will redirect the serial output to a virtual serial, in this case it tells me to look to `/dev/ttys004`:

```
char device redirected to /dev/ttys004 (label serial0)
```

Changing our expected PROMPT in the first iteration of our script to expect for a different prompt and telling it to look
to the new virtual serial:

```python
...
    SERIAL_PORT = "/dev/ttys004"
    TIMEOUT = 40
    PROMPT = "qemuarm64-36267642 login:"

    def test_wait_for_PROMPT(self):
...
```
Yields the exact same result as before, we have succesfully double-targetted a test with hardware-in-the-loop!

Again, why is this useful at all? Imagine you have an issue with your board but QEMU works. By default you're narrowing
down the issue to something specific to your hardware, not the build itself, which can save you from a whole lot of
trouble.


## Closing Remarks

I hope this was useful. This is something that a lot of companies do but not many people talk about, and I'm happy to
get the information out! Note that in reality, there are whole teams dedicated to this process and maintaining infrastructure
to run tests...[^1] what I've done here is just give you a general idea.

Next installment we'll talk about test scheduler architectures and how we've developed our own Torizon Testing Framework
that anyone can easily use, plus how we use it to test core projects inside the Torizon team.

Please send questions about this article to my e-mail `leonardo.held` [at] `toradex.com`. I'll be happy to answer them.

[^0]: An example of such software that runs in the browser: https://wokwi.com/projects/355043425307837441
[^1]: The BSP team at Toradex had a great talk going over some of our LAVA (which is an open source testing orchestrator)
setup, available here: https://www.youtube.com/watch?v=4nRQMXfj4u4.
