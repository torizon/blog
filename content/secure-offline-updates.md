---
title: "Secure offline updates: Why conventional approaches fall short"
date: 2023-10-10
author: Daniel Lang, CMO
draft: false

tags: ["Over-the-Air"]

abstract: Embedded devices are increasingly expected to support software updates. But let’s face it, the process is often complicated, unreliable, and insecure. Here, we explore the shortcomings of prevalent offline update systems and show how to make the process simple, secure, and reliable.

image: https://docs.toradex.com/113914-secure-offline-updates.jpg
---

Embedded devices are increasingly expected to support software updates. But let’s face it, the process is often complicated, unreliable, and insecure. Here, we explore the shortcomings of prevalent offline update systems and show how to make the process simple, secure, and reliable.

Software updates have become indispensable for a growing range of devices, including industrial machines, medical equipment, and IoT devices. Security is a key driver. Updates allow device manufacturers to secure their devices against evolving security threats by issuing patches to protect devices and user data. Innovation is another. By enabling continuous software evolution on devices in the field, software updates can speed up the pace of innovation.

Online update capability is establishing itself as the gold standard for state-of-the-art devices, for several reasons. The ability to issue updates from a centralized location reduces maintenance efforts (and CO2 emissions) associated with dispatching technicians to remote locations. It all but eliminates expensive recalls. As companies like Tesla have shown, the ability to offer premium software updates enables entirely new business models, paving the way for recurring revenue streams.

However, remote online updates are not always feasible. A case in point is legacy devices that were not designed with wireless connectivity in mind. The same is true for extremely remote deployments beyond the reach of wireless network coverage. In situations like these, offline security updates continue to be prevalent in real-world deployments, even as online updates are becoming the norm.

Whether they are performed on- or offline, the expectations on device updates are somewhat obvious. Cost, effort, and the risk of downtime should all be kept as low as possible while offering maximum security. Implementing the basic functionality required to meet these objectives may seem quite straightforward initially. But when you consider edge cases and other devious aspects encountered in everyday deployments, the task can become much more challenging.

## Shortcomings of common offline update systems for IoT devices

In what follows, we examine six common approaches to performing offline updates for IoT devices, explore some of their drawbacks, and introduce our solution to the challenges they pose.

### Simple file-based USB updates

A common approach for offline device updates involves inserting a USB stick containing the software update into the device’s USB port and simply copying the updates onto the device. While the process, which can be used to update software applications, is simple and quick to implement, it comes with several potential stumbling blocks.

In addition to being poorly (or not at all) secured, file-based USB updates often lack error-handling capability, offering users little to no insight into the state of the system during and after the update. As a result, the system can end up stuck in an undefined state (or “bricked”) if, for example, the USB stick gets pulled out early, requiring the intervention of a trained technician on site.

### Recovery mode

Recovery mode offers another way to update devices. By exposing the pins used to enter recovery mode to the customers, they can load new software on their devices and restore applications.

As in the previous case, security is essential to prevent malicious actors from uploading software they have tampered with to the device. Accessing recovery mode is often deliberately designed to be difficult, preventing accidental and abusive use. As a result, it may require skilled labor. Additionally, because the process overwrites existing software on the device, devices need to be reprovisioned following the update.

### Swapping out the SD card or the entire module

Some manufacturers suggest swapping out the SD card containing the software or, in some cases, swapping out the entire module running the software as a means of performing offline updates.

Both approaches enable full-stack upgrades. Admittedly, they are typically labor-intensive, sometimes needing to be performed only by skilled technicians, and require reprovisioning devices following the upgrade.

### U-Boot scripts

U-Boot lets users execute scripts that prompt the device to check for updates during the boot process. While this approach offers more flexibility than recovery mode, including the possibility to perform OS updates, it does little for security and error handling. Furthermore, performing updates using U-Boot scripts typically requires skilled labor.

### SSH/Serial connection

SSH/Serial connectivity provides another way to update devices manually or using scripts. Simple and offering a lot of control, this approach can, however, lead the system to enter an undefined state. Additional drawbacks of this approach include dealing with key and access management and opening devices with a hard-to-access serial port.

### Software update frameworks

Finally, various frameworks have been developed to simplify the deployment of software updates to embedded devices, including SWUpdate, OSTree, and RAUC. These frameworks are, however, not primarily concerned with security and can be further improved upon.

|                                | No risk of downtime due to bricking | No specialized labor requirements | No reprovisioning needed | Adequate security |
|:------------------------------:|:-----------------------------------:|:---------------------------------:|:------------------------:|:-----------------:|
| Simple file-based USB updates  |                  ✘                  |                 ✘                 |             ✔            |         ✘         |
| Recovery mode                  |                  ✘                  |                 ✘                 |             ✘            |         ✘         |
| Replacing SD card or module    |                  ✘                  |                 ✘                 |             ✘            |         ✘         |
| U-Boot scripts                 |                  ✘                  |                 ✘                 |             ✘            |         ✘         |
| SSH/Serial connection          |                  ✘                  |                 ✘                 |             ✘            |         ✘         |
| Software update frameworks     |                  ✔                  |                 ✔                 |             ✔            |         ~         |
| Torizon secure offline updates |                  ✔                  |                 ✔                 |             ✔            |         ✔         |

*Comparison of various offline update systems for embedded devices*

## Introducing Torizon secure offline updates for IoT devices

{{< figure src="https://docs.toradex.com/113914-secure-offline-updates.jpg" title="Torizon Secure Offline Updates" >}}

Time and again, we’ve seen that device manufacturers are pressed to release software updates as quickly as possible. It’s hardly a surprise that issues such as security, error handling, and downstream impacts of faulty software upgrades take a backseat to their economic imperative to hit the market quickly. That’s why we’ve developed a framework designed to make offline updates for embedded Linux devices simple, secure, and reliable as part of Torizon, our easy-to-use industrial Linux platform.

We’ll be exploring the ins and outs of Torizon secure offline updates in more detail in an upcoming installment of the blog. Learn more about simple, secure, and reliable offline software updates by heading to the dedicated product page and checking out our recorded webinar on the topic.