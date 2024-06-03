---
series: "IoT Security Blog Series Part 2"
title: "The dangers of remote updates"
date: 2022-02-10
author: Jon Oster, Torizon Cloud Lead
draft: false

tags: ["Security", "IoT", "Over-the-Air"]

abstract: If you take a moment to think about what a remote update system is doing, it should be clear why it’s so sensitive.

image: https://docs.toradex.com/110743-iot-security.png
---

This is part 2 of our 7-part series about over-the-air software updates. In part 1, we told you about all the reasons it’s important to be able to deliver software updates remotely - in today’s world, you can’t keep any connected device secure unless you can update it. Today’s post, though, goes in the opposite direction: we’re going to look at why software update systems can be incredibly dangerous, and why you should treat them with skepticism and caution.

## The most dangerous system you can implement

If you take a moment to think about what a remote update system is doing, it should be clear why it’s so sensitive. By definition, your software updater is downloading software from the internet and running it with root privileges. In an IoT system, it’s often doing that without any user interaction. Like we mentioned last time, a security problem on a device that can be remotely exploited is very bad. But a compromise of the remote update system is even worse, because it could mean that every single device that relies on that system for updates can be infected, taken over, held hostage with ransomware, and so on.

It’s easy to imagine that software update systems are popular targets for attackers. But, does this bear out in practice? Well, yes: in fact, some of the most famous and destructive cyberattacks of the last decade were accomplished by compromising software update systems.

Connected Devices Security
Connected Devices Security

## [The $10 billion mistake](https://www.wired.com/story/notpetya-cyberattack-ukraine-russia-code-crashed-the-world/)

To illustrate some of the dangers, let’s take a look at one particularly instructive case study. In 2017, a [ransomware attack spread across key PCs inside companies across the world](https://www.wired.com/story/petya-plague-automatic-software-updates/). It started in Ukraine, eventually infecting over 12,500 machines, but infections were observed around the world as well, hitting companies in 64 countries, including Brazil, Germany, Russia, and the United States. The thing that made this particular attack notable were the types of computers that were getting hit: very often, the initially-infected computers were in finance, accounting, or fulfillment departments. This caused huge economic disruption, with some companies not being able to process payments or fulfill orders at all: the total losses were later estimated at $10 billion USD by US Homeland Security officials.

It turned out that the common thread was a piece of tax preparation software, sold by a company called M.E. Doc. The makers of this software knew it was important to update their software every year, in response to changes in tax regulations and procedures, so they built in their own auto-update function. An attacker got control of the update system, and the way it was implemented allowed the attacker to distribute whatever software he wanted. This is a common theme when people start looking at and thinking about building software update systems: it can seem like a relatively easy problem to tackle, with security problems being easy to solve using basic cryptography. But there is a lot more to think about than is obvious at first glance, especially when it comes to IoT.

## Nobody is immune

You might have read the last section and thought to yourself that there must have been some obvious mistake this company made, and you wouldn’t fall into the same trap. But update system compromise doesn’t just happen to smaller companies: you’d expect, for example, that a company like Microsoft would be able to keep their update system safe. But a fatal (if subtle) flaw in Windows Update was actually the attack vector for arguably the most famous malware in history - [Stuxnet](https://en.wikipedia.org/wiki/Stuxnet), the worm that caused significant damage to Iranian nuclear facilities.

In the next article in this series, we’ll go into the specifics of what goes wrong in update system implementations, including looking at exactly what happened in that case, as well as a few other high-profile software update system compromises. But the main thing to take away today is that a software update system (and whatever security framework or design protects it) could be the most dangerous piece of infrastructure in your entire company. It needs to be designed with resilience in mind so that it’s not a single point of failure, and even if parts of it are attacked or compromised, you don’t put your users and your company at risk. Keep following this series, and we’ll tell you exactly how to do that.