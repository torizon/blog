---
title: "Embedded Software Testing: the Hardware-Software Interface (Part 1)"
date: 2024-08-14
author: Leonardo Held, Torizon Developer
draft: false

tags: ["Testing", "Embedded", "Linux", "Embedded"]

abstract: A series about Embedded Software Testing.

image: /tivoli-waterfalls.png
---

This series of blogposts will deal with embedded software testing. I want to pass on to the reader the hard-earned
knowledge from around 5 years of working with embedded software testing.

We'll start with some definitions and then go through more practical aspects of software testing. Our focus here will
be Embedded Linux, but the concepts and the tooling can surely go beyond it, such as in the realm of microcontrollers.

### Why test?

Embedded Systems are pretty different than your usual application. There are two key components that create the
necessity of testing:

1. Embedded Systems need to be fault-tolerant: meaning you don't want the blood pump, the gas pipe controller or the
submarine nuclear control system to go haywire when it shouldn't and...
2. Embedded Systems are expensive to fix: because most of the times will need to physically send an engineer over to
the field.

Other reasons are most likely derived from these general two, and testing exists to make sure you can ship a product and
not get sued afterwards.

But, testing is like a chicken and egg problem, you need to trust something, a "Trusting Trust" situation and that's why
we make use of scale in Embedded Software. For example, you need to make sure your Linux Kernel system boots, but that
requires that the bootloader works which requires that the PMIC firmware works, which requires that the traces in the
PCB itself work which requires that Sir James Clerk Maxwell wasn't wrong.

The Embedded Linux testing framework we'll show in the next parts of this series even has testing itself, so you test
what you're using to test with!

This leads to a situation where we divide the testing into "tiers" to make sense of it, and each tier trusts that
the one below is properly working. I roughly divide testing tiers into the following categories, which remember, may differ
from other fields such as web developing but generally follows the same naming conventions:

1. Unit Testing: a function or method.
2. Integration Testing: a combination of two applications via IPC or a program that depends
on the output of another.
3. End-to-end Testing: what's actually shown on the screen, a fully featured system executing its purpose.

### Unit Testing

Unit Testing is perhaps the easiest to point examples to because it's fairly standard in the software industry. You have
testing frameworks that can mock responses of functions, expect responses etc. The gist of Unit Testing is that you see
a unit of code as a black box, and verify that the responses of that black box will yield
the correct result when given a precise stimulus;

As an example, take this short Python function we use in one of our softwares here at Toradex

```python
    device_id_dict = {
        "verdin-imx8mm-07214001-9334fa": "imx8mm",
        "verdin-imx8mp-15247251-0bd6e5": "imx8mp",
        "verdin-am62-15133530-24fe44": "am62",
        "colibri-imx8x-07203041-b5464c": "imx8x",
        "colibri-imx7-emmc-15149329-6f39ce": "imx7",
        "colibri-imx6-15054304-e259ec": "imx6",
    }

    def test_parse_device_id(self):
        for device_id, expected in device_id_dict.items():
            with self.subTest(device_id=device_id):
                self.assertEqual(parse_device_id(device_id), expected)
```

It's quite simple: it's a function that tests that the `parse_device_id` function will return the correct "expected" response by
parsing a `device_id_dict` which has the stimuli as a key and the expect value as a value of that key.

{{< figure src="/unit-test-schema.png" title="Unit Testing" alt="a basic diagram showing unti testing of a function" width="90%" class="centered-figure">}}

This function runs when we want to unit test our software and it makes sure that our `parse_device_id` function works as
expected. By the way, this is almost an extreme example because the function is pretty short:

```python
def parse_device_id(device_id):
    parts = device_id.split("-")
    return parts[1] if len(parts) > 1 else None
```

But it's used as a critical piece of code, so it must be tested.

Unit tests guarantee two things:

1. New code works as intended
2. New code won't break existing use-cases

The latter we call "regression testing" which teach us a powerful aspect about the matter at hand: testing should reflect
the use cases of a system, at all testing levels. If your product measures the amount of humidity in the soil, you can already imagine that
you'll eventually need to stick it into some wet sand.

This kind of thinking provides some relief to the fact that by definition, Embedded Systems are purpose-made, bespoke,
so you if it's not an use-case, you don't test it.

Back to topic, you generally run Unit Tests at the Continuous Integration level and locally, meaning before you `git push`
and before you `git merge` so you get an automatic gatekeeper for a possible release and ideally, your main branch is
always releasable.

#### Mocking in Unit Testing

Note that sometimes, non-leaf functions need to be patched in order to have a controlled response from a provided output,
for example:

```python
# Leaf function (that will be mocked)
def parse_sensor_value():
    """
        do some register reading, calibration etc...
    """
    return value

# Non-leaf function
def get_sensor_temperature():
"""
    perhaps engage in some further mathematics
    let's pretend it just purely returns the value
    from parse_sensor_value()
"""
    return parse_sensor_value()
```

Here we need to control the input somehow to this black box, as done in the previous case with unit testing, but in the
unit test example, with a leaf function, we only had to control the arguments and return value. We must thus use a "mock",
which is an object that behaves like the real one but we have control over its behaviour.

All that is to say that we need to make sure `parse_sensor_value` returns a fixed value of, let's say, 30.0.

```python
class TestGetSensorTemperature(unittest.TestCase):
    @patch('__main__.parse_sensor_value', return_value=30.0)
    def test_get_sensor_temperature(self, mock_parse):
        result = get_sensor_temperature()
        self.assertEqual(result, 30.0)
        mock_parse.assert_called_once()
```

In the same vein as before we control the inputs to the black box and verify that the value is what we expect it to be.

If the example from Unit Testing, `parse_device_id` wasn't a leaf function, the diagram would for the testing would look
something like this:

{{< figure src="/integration-test-schema.png" title="Unit Testing with Mock" alt="a basic diagram showing mock of a function" width="90%" class="centered-figure">}}

### Integration Testing

Integration Testing is when you have two units (hopefully tested but Unit tests themselves) and you test the connection between them.

Let's say you developed an application that uses a database with some kind of IPC between them to modify the state of the
database. If you follow Unit Testing, you *most likely already mocked the database* when you were implementing the system
at first, so it's a matter to connect both ends and see if the software actually works.

So as a simple integration test, you might want to read and write something from the database from your application.
Specially data representative of the type of data you might be managing.

{{< figure src="/integration-example.png" title="Integration Testing Example" alt="a basic diagram showing integration testing of a database" width="70%" class="centered-figure">}}

Over the years I've learned Integration Testing is very much dependent on the infrastructure you have when developing an
Embedded System, and it's also fairly dependent on the architecture itself. Nonetheless, mocking in Unit Tests is essential
if you have many interconnected systems developed by different teams, because it ensures better integration testing.

There are some strategies such as bottom-up and top-down during the development phase to ensure a smooth integration of
different systems, and I'll talk more about it in the next parts of this series.

### End-to-end Testing 

End-to-end testing - sometimes abbreviated as e2e - makes the black box out of the connection of several integrations.
Say a software like `nmcli` is used to control the network cards in a connected system and that connection in turn is used
to connect to an IoT cloud provider such as Torizon Cloud.

End-to-end Testing is pretty much if you took the "Unit" in the "Unit Testing" and turn it into the whole system. So you
still don't know implementation details, but you have controlled inputs and expected outputs.

A good example which I will illustrate in the coming parts is screen capture testing: the user sees what's in the screen,
right? So a good end-to-end testing is whether the screen shows what is supposed to be showing. Depending on the technology
stack, you could even simulate user-input and make sure that the transition of the states (like different panes in a web
application) are being done properly.

It's safe to say that the level of complexity here is very high, and I hope you can see now why it is important to divide
the tests in unit, integration and e2e. It helps you to be situated when an issue arises early and often.

{{< figure src="/levels-of-testing.png" title="Different Levels of Testing" alt="a basic diagram showing levels of testing" width="90%" class="centered-figure">}}

### Other levels of testing

Unit, Integration and End-to-End are what I consider "core testing" when developing an Embedded System.
Specially if you're developing a product that will hit the market, you might also want to consider other testing levels
such as Acceptance Testing, that adds requirements such as "is the UI performant?" and "Accessibility Testing", that makes
sure that the core of your userbase will be able to actually use your product.

Say, for some reason, you are developing a Human-Machine Interface for an Industrial machine. You know there's a rule
somewhere that says your application should reply within 160ms when a button is pressed. Every change you make in the
software is maybe impacting that hard deadline and with possible 100s of changes per week, bisecting which change introduced
the delays is unfeasible. The solution is of course testing that the machine is replying within the 160ms limit every time
a change is introduce, via testing.

### Testing, Refactoring

A lot of times you as an embedded engineer will need to have good arguments as to why spend time writing tests and
setting up test infrastructure and this section hopefully helps to address what you gain from a project perspective by
writing tests.

It's rare that teams work within a waterfall model where software is done in a whole swoop. Requirements change over time
and specially as you learn the system and customers misunderstand that seemingly 'simple' changes can have a profound
impact in the system development process.

The good news is that, if you have testing, it is immensily - I can't overstate how much - easier to refactor whole projects.
When you start refactoring - or adding things to the software - you really see the 'regression protection' testing gives
you shine. 

Say a customer needs another sensor attached to the equipment. No problem! You write the code for that specific sensor,
write the tests for that sensor and run the whole test suite: that guarantees that when you added this new sensor, you
broke no other use-case.

Or, another example, say now instead of one sensor you have three and it makes sense to abstract everything in a `Sensor`
class. You write some code, refactor the Unit tests and great, it passes. *You still have the integration and end-to-end tests*
to make sure you're not shipping something broken. Your changes were encapsulated and tested against the greater scope
of the system.

### Release Early, Release Often, Make Returns Early, Make Returns Often

This ties very well together with the "Release early, release often" mentality that is coming to Embedded. 

Let's say Company A is a developer that buy some Toradex modules, develops and application with Torizon and sells it to 
the Portuguese market.

Turns out Customer B of Company A is actually moving some of these devices to Brazil, where they write Portuguese but
with a radically different manner compared to their European counterparts: what do you do? Of course, that customer chose Torizon
so they can launch an OTA update to regionalize their application, but how do you make sure that in the process of regionalizing
the software you didn't break the user interface? Testing, naturally.

So tests are *necessary* to release often and early. You don't need to develop everything at once, but you do need to be
diligent about making software work.

### Conclusion

In the next part of this series we'll dive into the architecture of a testing system and strategies for dual-targetting.
We'll also start to discuss some practical aspects of testing and hopefully you can learn a thing or two from what I've
been using for the past years to test Embedded systems.

See you there!

Please send questions about this article to my e-mail `leonardo.held` [at] `toradex.com`. I'll be happy to answer them.
