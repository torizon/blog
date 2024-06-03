---
series: "IoT Security Blog Series Part 1"
title: "Why do we need remote updates for connected devices?"
date: 2022-01-18
author: Jon Oster, Torizon Cloud Lead
draft: false

tags: ["Security", "IoT", "Over-the-Air"]

abstract: With the explosion of internet-connected devices in recent years, there has been an industry-wide realization of the need to keep these devices updated throughout their lifetime.

image: https://docs.toradex.com/110438-mars-pathfinder.jpg
---

## Introduction

With the explosion of internet-connected devices in recent years, there has been an industry-wide realization of the need to keep these devices updated throughout their lifetime. This is the first part of a series that will explore the concept of remote over-the-air (OTA) updates, providing designers details they will need when implementing remote OTA update solutions into their systems. We will especially focus on the important security aspects. We’ll start with the basics.

## What is OTA?

The concept of remote OTA updates is quite simple; allow for devices to be updated while deployed into the field via a wired or wireless connection. We’ve gotten pretty used to our computers and phones needing updates. This is similar to how our mobile phones download updated apps as well as full OS updates while we go about our lives; we are not required to visit the Apple Store every time a new OS is released. As more and more devices (both industrial and consumer) are connected to the internet, it makes sense to use that connectivity to enable updates.

## What gets updated?

Ideally, you will be able to update all parts of the software stack on your connected devices. If you have a design running a single instance of an OS, you want to be able to update the bootloader, the base OS and the application stack. If you have multiple domains in the system running different systems (e.g. Linux on one core and FreeRTOS on a second) then you want to be able to update all the domains.

## Why do devices need OTA?

The simple fact is that all software has bugs. Even the most well-vetted, thoroughly well-tested software, will have issues after it is released. Consider the case of the [Mars Pathfinder](https://www.cs.unc.edu/~anderson/teach/comp790/papers/mars_pathfinder_long_version.html); I think it's a safe bet that most software development processes are significantly less thorough than used by JPL for missions to another planet where the cost of software errors is huge. And if even they cannot find and fix all issues before shipping, what chance do the rest of us have? Fortunately for the Pathfinder team, they had built update capability into the system (Over the Vacuum Updates?) so they were able to address the issue and recover the mission without the need to send a technician on-site.

Mars Pathfinder
Picture Source: https://mars.nasa.gov/mars-exploration/missions/pathfinder/
While the surface of Mars is a hostile environment for any technology, many of our designs are deployed into environments with a different kind of hostility. Threats come from a wide variety of sources and all system designers need the ability to respond to these. Devices in large numbers can be used to wreak havoc on the internet. Consider the case of the [Mirai Botnet](https://en.wikipedia.org/wiki/Mirai_(malware)). This large network of devices was used to perform a [distributed denial of service attack](https://en.wikipedia.org/wiki/2016_Dyn_cyberattack) on one of the largest Domain Name Service (DNS) providers causing widespread outages for many recognized brands. Most of the devices used in this attack were simple Linux-based devices performing routing, security cameras, printing, or other network services. The basic flaw was the reuse of default login credentials allowing the botnet authors to easily take over a large number of devices; with some reports as high as 600,000 attacking nodes. The specific vulnerability, in this case, is extremely simple to exploit, but also extremely easy to fix. These devices should have been updated so that default credentials are removed and replaced with an end-user-specified login and password. Cost estimates vary but [ZDNet](https://www.zdnet.com/article/mirai-botnet-attack-against-krebsonsecurity-cost-device-owners-300000/) has reported that each infected device cost owners about 13.50 USD including power and additional bandwidth costs. This will add up when working with a large device fleet. More difficult to account for is the brand damage that will be caused to both the device manufacturers and the websites targeted by the attack.

In addition to causing network outages, device breaches can cost your company in terms of brand damage and cash. Take the case of the [internet-connected fish tank](https://www.washingtonpost.com/news/innovations/wp/2017/07/21/how-a-fish-tank-helped-hack-a-casino/) that allowed attackers to exfiltrate proprietary data from a North American casino. I would certainly be wary of visiting a place that suffered such a breach and I am quite certain that they lost revenue after this was reported. It's remarkable that a fish tank, which is a low priority and thus low-security system, would allow attackers to move into higher security systems but successful attacks are rarely caused by a single flaw; they usually start with something simple and then use flaws, or even deliberate design choices, in other systems to move laterally through the target network. Internal resources are rarely as well protected as the network boundary devices, so any flaw that pierces that boundary can spell trouble for targets. The ability to update these kinds of Internet of Things (IoT) is critical as they can represent an easy way into a more secure system.

In addition to fixing issues with software updates, you can also roll out new features to your users. Depending on the device usage model, this can be done to help retain or expand your user base, or to provide additional revenue opportunities. [Tesla](https://www.tesla.com/) uses their OTA system to deliver after-market features such as autonomous driving to its users.

Finally, it should be noted that many governments are considering legislation to help improve the security of connected devices. The internet is woven into every aspect of civic life, so governments have a vested interest in encouraging better, more secure systems. The European Telecommunications Standards Institute (ETSI) defined standard [EN 303 645](https://www.etsi.org/deliver/etsi_en/303600_303699/303645/02.01.00_30/en_303645v020100v.pdf) which is focused on consumer IoT devices. It defines requirements such as:

No universal default passwords
Keep software updated
Ensure software integrity
and many other governments are using that as an example in crafting similar legislation. The US government has similar legislation, and it should be clear that these requirements cannot be met without a built-in software update mechanism.

## What kinds of devices require it?

At a minimum, any device with a persistent network connection should be OTA enabled. These connected devices are the most at risk simply because they are always online. But any device that gets connected to the internet, or even to internal intranets, should have OTA capability so that it can be patched and protected.

OTA - Connected Devices
Devices that are never connected are not at risk from network-based attacks but may be exposed to physical attacks depending on where they are located. Updating these devices will require user intervention (ie [sneakernet](https://en.wikipedia.org/wiki/Sneakernet)) due to the lack of connectivity but we feel that even in these cases, it is worth enabling updates.

## Wrapup

In this post we discussed the basics of OTA, focusing on motivation for adding this feature to your designs. In the next part of this series, we will go in the opposite direction, and tell you why OTA updates can be dangerous, and what the consequences can be if a poorly-implemented update system gets compromised.