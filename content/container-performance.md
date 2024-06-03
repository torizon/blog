---
title: "Performance Impact of Docker Containers on Linux"
date: 2022-12-13
author: Lucas Ferraz, Product Manager
draft: false

tags: ["Performance", "Container", "Linux", "Embedded"]

abstract: With the explosion of internet-connected devices in recent years, there has been an industry-wide realization of the need to keep these devices updated throughout their lifetime.

image: https://docs.toradex.com/112019-virtual-machine-containers-comparison.jpg?v=3
---

## Introduction

Developers seldom see a side-by-side performance comparison of running an embedded application natively versus inside a container. With the advance of containers adoption, many developers and sysadmins may be biased in thinking a container rivals a virtual machine - and other virtualization techniques - in performance. However, this could not be further from the truth. While virtual machines have their applications and use cases, they differ on an architecture level from containers, which makes them very different by design, including performance-wise.

{{< figure src="https://docs.toradex.com/112019-virtual-machine-containers-comparison.jpg?v=3" title="Virtual Machine and Containers Comparison" >}}

The key difference between those approaches is that containers don’t run on top of a virtualization engine (or a hypervisor). Instead, they run directly on your host’s kernel. Launching a process inside a container is no different than doing it on the device itself - except for the virtualized and isolated filesystem. In other words, containerized applications have, by design, exactly the same performance as their native counterparts, given relevant variables are correctly controlled.

In this article, we will explore some of those variables, and highlight some common mistakes and the best practices for creating and developing your containers with performance in mind. The goal here is not to show if the same-performance premise actually reflects real-life applications - spoiler: it does - but instead to show how you can get the most out of your container to make the Docker overhead virtually nonexistent. Lastly, we will also showcase some possible issues that may arise when starting multiple containers at once and how all of this affects memory and boot time.

For this article, the setup for hardware and software was as follows:

- Hardware stack: Apalis iMX8QM 4GB and Ixora Carrier Board + Heatsink
- TorizonCore 5.6.0 based Yocto build, with some added tools

## A little bit about containers

A container is, in a few words, a lightweight standard for packaging, deploying, and running applications. It contains every dependency, library, configuration files, and other files necessary for the application to function successfully. In sum, it simplifies reproducing your build and runtime environments, and it distributes the whole application package since the host device does not need any dependency installed except for the container engine itself.

Because of their design, containers have different particularities and, for that matter, a different goal than Virtual Machines (VMs). Contrary to VMs, performance is not affected if you have a containerized application compared to a native one. As mentioned, a containerized process runs directly on your host OS, only with its separate filesystem and permissions, thus having the same performance, in theory.

Ok, so the performance should be the same. Then, why is my application performing differently inside a container versus natively? There are many, many factors at play here, and it’s not easy to pinpoint exactly why the same application can perform differently in the two environments. The ground truth here is the following:

*If you have a statically linked binary, it will perform equally on both natively and fully privileged container environments, given they have the same system configurations.*

{{< youtube 1dzYF3zrihE >}}

From that, we start to iterate and check possible root causes:

- If the application is linked dynamically, is every shared library the same in the container and on the device? Do they have the same version, were they compiled using the same compiler, same compilation flags, with the same optimization enabled?
- If you compiled your container application in a Debian container and the native application in Yocto, did you match the versions of every lib, checked the compilation flags, etc?
- Does the container have all the necessary hardware access, permissions, and access setup correctly? Containers are secure by default, and you must explicitly allow access to key resources.

With all that in mind, we will go over some tests and results we got while measuring the container’s memory consumption. Although we won’t offer in this blog post an easy fix in case your performance is not ideal, Toradex may help you get the best of your container performance-wise. If you need help with that, drop us a note at our community forum!

## Testing & Results

First, we need to talk about base resource consumption and boot time. Tests with containers show a small increase in memory usage (both during application launch, and steady-state) and boot time. For the following test, we deployed a sample Qt application on top of the Weston compositor, and measured time and memory usage - as showed on the video above. Analyzing results, the memory overhead for the deployed stack is small (our tests show around ~23 MB), and the program’s launch time increase is around ~5.2 seconds. You must evaluate if the benefits of using containers (shorter development time, ease of use, testing environments, reliable builds, OTA support, …) outweigh this small performance and launch time impact.

{{< figure src="https://docs.toradex.com/112020-containers-native-applications-memory-usage.jpg" title="Containers and Native Applications Memory Usage" >}}

Also, there are other “gotchas” you should know about containerized applications. An example happens when you start a new container: there’s a short peak in memory while the Docker daemon configures everything and creates your container. In the example below, the graph shows memory usage for the same sample Qt application and Weston. The first spike (around the second ~3.8 s) happens when the Weston container starts, and the second one (around the second ~15.5 s) when the actual Qt applications start. For this test, we started each container manually, so the time is not reflective of start time.

{{< figure src="https://docs.toradex.com/112021-qt-weston-container-performance.jpg" title="Qt and Weston Container Performance" >}}

You should also notice that the start time for the container is considerable. Weston, for example, takes a bit less than 1.5 seconds to launch, while the Qt application launches in just short of 3.5 seconds, totaling just short of 5 seconds total. In contrast, if running natively, 2.2 seconds is the required time to start the whole stack (Weston and the demo).

However, when starting multiple containers at once, the memory spike is even greater, although the launch time is not too affected (given your device has enough cores). The first two graphs in the image below compare memory usage when starting one container versus starting five. All containers are the same and perform a simple sleep 10 command.

{{< figure src="https://docs.toradex.com/112022-containers-performance.jpg" title="Containers Performance" >}}

When you need to launch multiple containers, the device will reboot if they require more memory to launch than what’s available on your System on Module (SoM). Moreover, if you set the --restart flags on the containers to always restart, you may be stuck on an indefinite reboot loop! To mitigate this issue, you can either:

- Rework your application to use fewer containers (recommended); or
- Create “start” dependencies between your containers, making them launch one after the other instead of all at once. That will create a trade-off between the application launch time and the memory spike. The third graph in the above image illustrates what this approach looks like performance-wise.

We have a short section in our documentation with some information that may help you in this regard, if you want to know more.

With that said, you must always keep memory usage in mind when starting multiple containers at once, although launch time shouldn't be too much of a problem. Also, remember there's always the trade-off to lower the memory spike while increasing application launch time. The lower memory and performance you have available on your system, the more attentive you need to be with this trade-off selection. Nevertheless, for most of our modules supporting TorizonCore, the amount of containers that can be launched at the same time is within the range identified in the majority of use cases. Even so, we are working in solutions to improve it: stay tuned with our releases and contact our support to let us know about your use cases!

## Conclusion

There is a large number of things that may influence your application's performance. In this blog post, we went through a few of them and, even though it's complex and specific for different use cases to pinpoint specifically what may lead your application to perform poorly, we presented some possible challenges you may face.

Albeit the small memory consumption increase does exist when running a containerized application, we also argue that the values you get out of a Docker environment in application development largely outweigh its drawbacks. With all that said, Toradex is proactive in helping our users to improve their application’s performance, so in case you are experiencing poor performance in your application layer, be sure to drop us a message!
