---
title: Wait! My Container is Crashing Before Startup
date: 2024-08-08
author: Leonardo Graboski Veiga, Product Owner Torizon OS
draft: false
tags:
    - Container
    - Embedded
    - Linux
abstract: How to implement container startup sync so that your application doesn't crash due to inter-container communication errors
image: ./concurrent-container-startup.png
---

When [using more than one container in a project](https://developer.toradex.com/torizon/application-development/working-with-containers/using-multiple-containers-with-torizoncore/), a probable scenario developers are faced with is startup errors due to a lack of inter-container app synchronization.

This often happens due to two reasons:

1. Containers are started in parallel leading to race conditions.
1. Even when starting one container after the other, containers don’t know when your application and its dependencies started.

Especially on Embedded Linux, which is the case of [Torizon OS](https://www.torizon.io/), this is bad. These systems might be deployed to remote, hard-to-reach locations, and on-site maintenance may cost a lot.

This article explains this issue in more detail, proposes several solutions that fit different use cases, and validates some of the solutions in a real project.

I chose to experiment on a QEMU machine instead of real hardware, because:

- I assumed there might be greater CPU performance variation depending on other things running on my PC, thus adding some uncertainty to timings.
- Evaluating a platform without hardware may be an interesting solution, especially in the early days of development. Please let me know if you use or would like to use Torizon OS with emulation or virtualization. If you want to give it a try today, check the open-source community version of Torizon OS - [Common Torizon](https://www.torizon.io/open-source-community) - where QEMU variants for Arm64 and x86 are [released as pre-compiled binaries](https://github.com/commontorizon/meta-common-torizon/releases).

## The Problem

Let’s take as an example two containers that interact via some network inter-process communication method. Here is the hypothetical Docker Compose file:

```yml
version: "3.9"
services:

  container1:
    image: my/container1
    networks:
      - localnet

  container2:
    image: my/container2
    networks:
      - localnet

networks:
  localnet:
    internal: true
```

Figure 1 illustrates the first scenario. Even though the app in *Container 1* is ready and able to make requests, if it does, the app in *Container 2* is not ready and thus it won’t respond as expected:

![A time diagram of two containers starting each an application in parallel, without any sync mechanism](/concurrent-container-startup.png "Concurrent container startup")
*Figure 1: Concurrent container startup*

Figure 2 illustrates the second scenario. Even when starting the second container as dependent on the first one, the app in *Container 2* is not ready to respond to requests from the app in *Container 1*:

![A time diagram of two containers starting each an application in parallel, synced with the Compose depends-on method](/sequential-container-startup.png)
*Figure 2: Sequential container startup*

There are other conclusions we can derive from the above charts:

- In both cases, if the app from Container 2 is the one to request the app from Container 1, things will always work as expected because the app from Container 2 is always the one that takes longer to start. In other words, if the apps that are dependencies start earlier, then there are no problems.
- In other cases, things might intermittently work. This would happen when both apps are ready and very close to each other.
- As the apps evolve, there is a possibility that an update has the inverse effect on app startup, and then either something broken starts to work, or vice-versa.

A question remains: how to solve this kind of issue?

## Solutions

There are some approaches to solving this issue. Let’s go through each of them (at least the ones I thought about) - from the (arguably) worst to the (arguably) best solution - in depth.

### Do nothing

This is the most obvious one and if you are reading this article you probably found out that, by doing nothing, your app is not working.

But if you came up here for other reasons, it’s worth stating that maybe you don’t have to care about this startup sequence and sync issue. Then, you need to do nothing about it!

### Use a single container instead

One way to get the container orchestration out of the way is to put everything in a single container.

The tradeoff is that you lose the various benefits of keeping things apart, such as providing granular permissions to each container and being able to have separate development and release cycles, just to name a few.

### Sleep for a while before the “entrypoint“ or the “command“

If you have been around for a while doing or integrating software, for sure you have seen sleep statements used to keep things in place. They are often terrible and for sure will bite you in the neck at the worst possible moment.

That all said - mostly to warn you - I had to mention this “goto” solution due to its simplicity and usefulness in some cases.

If the software in the container that needs to sleep is yours, just add the sleep statement somewhere.

If the software isn’t yours, just try to hack your way into adding the sleep to your [entrypoint](https://docs.docker.com/compose/compose-file/05-services/#entrypoint) or [command](https://docs.docker.com/compose/compose-file/05-services/#command) statement. Both can be overridden in the Docker Compose file. Here is an example:

```yml
version: "3.9"
services:

  container1:
    image: my/container1
    networks:
      - localnet
    entrypoint:
      - /bin/sh
      - -c
      - sleep 30 && /run/my/command options

  container2:
    image: my/container2
    networks:
      - localnet

networks:
  localnet:
    internal: true
```

Through trial and error, I found out that running multiple commands directly in the entrypoint or command statements is very prone to error. Therefore, I recommend you put them in a separate wrapper script and then run it:

```yml
------------  wrapper.sh ------------
#!/bin/sh

sleep 30
/run/my/command

-------  docker-compose.yml ---------
  container1:
    ...
    entrypoint: /path/to/wrapper.sh
```

It did look simple at first, right? Looking back, though, it feels like too much trouble for a lazy solution. Let’s move on and see if we can find something that is better and easier.

### Modify your app to wait for the service

In the previous section, it was written:

> If the software in the container that needs to sleep is yours, just add the sleep statement somewhere.

Well, if you are willing to change your app, maybe the best solution is to just check if the service is available instead of just sleeping.

While it depends on the programming language and inter-process communication method you are using, here is a shell example for illustration purposes:

```sh
# Wait for services to be up and running
while ! is-service-running; do
    echo "Waiting for service to be ready..."
    sleep 1
done
echo "Service ready!"
```

This is a nice solution. Why is it so early in my worst-to-best list? Because it doesn’t work when the app is not yours to modify it. Therefore, it could well be the best solution, it depends on your scenario.

### Always restart failed containers with “restart: always“

An alternative brute force solution might be to keep restarting the failed container until it doesn’t fail anymore. On the bright side, it’s a simple solution, albeit not very elegant.

Let’s implement it with the [Docker restart policy](https://docs.docker.com/config/containers/start-containers-automatically/#use-a-restart-policy) and the respective [restart](https://docs.docker.com/compose/compose-file/05-services/#restart) property from Docker Compose. Notice that, since the default value is “no“, we can think of it as if our Compose already implicitly makes use of it.

We must use either the “on-failure“ or “always“ option. Here is the updated Compose file:

```yml
version: "3.9"
services:

  container1:
    image: my/container1
    networks:
      - localnet
    restart: always
    # restart: on-failure # alternative to "restart: always"

  container2:
    image: my/container2
    networks:
      - localnet

networks:
  localnet:
    internal: true
```

For this to work, your application must exit on failure. If it exits with a success code despite the error, then you must use `restart: always`, but it if exits with an error code, then you can use either `restart: always` or `restart: on-failure`. Also, make sure to understand some limitations of this technique in the [restart policy details](https://docs.docker.com/config/containers/start-containers-automatically/#restart-policy-details).

Regardless, making use of this option makes your application more resilient in the field, where you want the system to keep running without intervention and recover after failure. Therefore, even if this doesn’t make your sync issues go away or even if you don’t like it for such a purpose, it probably makes sense to add it to your Compose anyway.

### Sequential startup with “depends_on“

This solution implements the sequential container startup mentioned in this article’s introduction.

It may not be ideal and it may not be a bulletproof solution depending on some variables. Yet, it has some usefulness that even goes beyond a synchronous startup: you make sure that a given container only starts after the other one it depends on is successful.

To achieve it, we make use of the [depends_on](https://docs.docker.com/compose/compose-file/05-services/#depends_on) property from Docker Compose. Let’s modify the original example to include the dependency:

```yml
version: "3.9"
services:

  container1:
    image: my/container1
    networks:
      - localnet
    depends_on:
      - container2

  container2:
    image: my/container2
    networks:
      - localnet

networks:
  localnet:
    internal: true
```

But again, as mentioned in the introduction, even though it gives more time for container2 to be ready it still depends on timing.

### Conditional startup with “depends_on“ and “healthcheck“

Let’s take the previous example as a base and improve it a bit. Instead of using the default behavior of depends-on, which is to wait for the container to start, we can use the [depends_on long syntax](https://docs.docker.com/compose/compose-file/05-services/#depends_on) together with the [Docker healthcheck](https://docs.docker.com/engine/reference/builder/#healthcheck) and the corresponding [Docker Compose healthcheck property](https://docs.docker.com/compose/compose-file/05-services/#healthcheck) to only start the container if the dependency is healthy.

Let’s see what would it look like in the modified example:

```yml
version: "3.9"
services:

  container1:
    image: my/container1
    networks:
      - localnet
    depends_on:
      container2:
        condition: service_healthy

  container2:
    image: my/container2
    networks:
      - localnet
    healthcheck:
      test: ["CMD-SHELL", "some-test-command", "option1", "option2"]
      start_period: 30s
      start_interval: 5s

networks:
  localnet:
    internal: true
```

For this solution to be optimal, you must adjust other healthcheck parameters such as interval and timeout, among others as defined in the [healthcheck reference](https://docs.docker.com/engine/reference/builder/#healthcheck).

## A Real Example

Let’s illustrate using some of these techniques with a real example. To keep the text concise, through the article, I’ll omit several parameters from the Docker Compose files. As we make progress, working samples with the full source code will be shared with you.

Consider the following project and respective technologies used in between parenthesis:

- A script collects data from a remote device via a simple API (bash script);
- Stores it in a local database (InfluxDB);
- Creates a local visualization with a web app (Grafana); and
- Displays it on a local display (Wayland/Weston and Chromium).

Here is a diagram of the containers that will be required and their interaction:

![A relationship diagram with five containers that have inter-container dependencies between them](/containers-and-dependencies.png)
*Figure 3: Real example containers and dependencies*

In Figure 3, the arrow points to the dependencies. For instance, *Debian (Bash script)* depends on *Database (InfluxDB)*.

### Parallel Startup

Let’s see what the simplest Docker Compose would look like:

```yml
version: "3.9"
services:

  app:
    image: influxdb:2.7.5

  database:
    image: influxdb:2.7.5

  visualization:
    image: grafana/grafana:10.2.3

  graphics:
    image: torizon/weston:3.2.2

  gui:
    image: torizon/chromium:3.0.2
```

If we try to run it, the following is observed:

1. The GUI container - which should start Chromium in kiosk mode - exits with an error because it cannot connect to the Wayland display:

    ```sh
    # failed to start Chromium
    example0-gui-1            | 2024-01-22T20:13:26.070615305Z[1:1:0122/201326.060631:ERROR:wayland_connection.cc(209)] Failed to connect to Wayland display
    example0-gui-1            | 2024-01-22T20:13:26.076997343Z[1:1:0122/201326.075089:ERROR:ozone_platform_wayland.cc(226)] Failed to initialize Wayland platform
    example0-gui-1            | 2024-01-22T20:13:26.082940155Z[1:1:0122/201326.079115:ERROR:env.cc(225)] The platform failed to initialize.  Exiting.
    example0-gui-1 exited with code 1
    ```

1. The app container should create a new InfluxDB bucket and then periodically write data into it. By examining the early logs, we notice it fails to do both due to a connection refused error caused by the fact that InfluxDB is not yet ready to take requests:

    ```sh
    # failed to create bucket
    example0-debian-1         | 2024-01-22T20:13:23.882560126ZError: failed to lookup org with name "toradex": Get "http://database:8086/api/v2/orgs?org=toradex": dial tcp 10.89.7.11:8086: connect: connection refused

    # failed to write data
    example0-debian-1         | 2024-01-22T20:13:31.617488493ZError: failed to write data: Post "http://database:8086/api/v2/write?bucket=jenkinsdatabucket&org=toradex&precision=ns": dial tcp 10.89.7.11:8086: connect: connection refused
    ```

1. The app container continues to fail to write data into the InfluxDB bucket, this time because the bucket does not exist - which means that InfluxDB is ready to work, nevertheless, an early error leads to this problem:

    ```sh
    example0-debian-1         | 2024-01-22T23:25:25.690989379ZError: failed to write data: 404 Not Found: bucket "jenkinsdatabucket" not found
    ```

Given the Docker Compose `--timestamps` option, it is possible to reconstruct the timeline in which everything happened:

![Container startup timings for 5 containers that have inter-container dependencies](/parallel-startup-timings.png)
*Figure 4: Parallel startup timings*

From the data above, a few comments are worth noting:

- The container and app initialization are not split, due to missing data points on the transition.
- The app error 3 is a side-effect of a failed initialization. It can be disregarded for the moment.
- It is not possible to know the GUI initialization time.
- If we take into account Figure 3 and analyze the dependencies, we may come up with an educated guess on strategies to ensure proper container startup synchronization:
    - The app requires the database, which is about 10 seconds far away:
        - Sleep could work here.
        - Since we have control over the app, a loop that waits for the DB to become ready before any other operation looks a bit more elegant than the sleep, and is still easy to implement.
        - A restart policy will have no effect here since this Bash script doesn’t seem to exit on error.
        - I would bet against the depends_on approach, due to the database startup taking noticeably longer than its container startup.
        - A healthcheck will have a similar effect to modifying the app, but it doesn’t sound as straightforward to implement.
    - The visualization requires the app and database, and therefore it might be far enough into the initialization.
        - Doing nothing seems to be a good approach, at least for now.
    - The local GUI crashes due to a small 1-second difference.
        - Sleep could work here.
        - A restart policy might work here, since the container crashes.
        - Depends_on might work here, due to the short time difference, although it sounds a bit risky and prone to working by chance - at least until more testing is conducted.
        - A healthcheck sounds like an elegant approach since the GUI and the graphics containers are both third-party apps. Also, there is a clear interface being expected by the GUI, which is the Wayland connection being available.

This sample is available as `example0` on [leograba/container-startup-sync](https://github.com/leograba/container-startup-sync).

### Synchronized Startup

Let’s give it a try! We’ll modify the app to wait for the DB to become ready, and implement a healthcheck for the GUI.

The updated app snippet might look like this:

```sh
# Wait for database to be up and running
while ! influx ping; do
    echo "Waiting for InfluxDB to be ready..."
    sleep 1
done
echo "InfluxDB ready!"
```

And the updated Compose file:

```yml
version: "3.9"
services:

  app:
    image: influxdb:2.7.5

  database:
    image: influxdb:2.7.5

  visualization:
    image: grafana/grafana:10.2.3

  graphics:
    image: torizon/weston:3.2.2
    healthcheck:
      test: ["CMD-SHELL", "test", "$$WAYLAND_DISPLAY"]
      start_period: 5s

  gui:
    image: torizon/chromium:3.0.2
    depends_on:
      graphics:
        condition: service_healthy
```

The hypotheses were proven true:

- The app errors on creating a bucket and writing to it vanished. All operations seem to work as intended.
- Chromium started successfully and loaded the given URL - although the URL loading failed for a while until the visualization app became available to serve the web app.

Before trying to fix the web app loading sync, and also for the sake of completeness, let’s have a look at the updated timings chart extracted from the Compose logs:

![Container startup time measurement after the first attempt to implement a sychronized startup](/synchronized-startup-timings-first-attempt.png)
*Figure 5: Synchronized startup timings - first attempt*

This sample is available as `example1` on [leograba/container-startup-sync](https://github.com/leograba/container-startup-sync).

Unfortunately, we don’t get any info on when Chromium tried to load the website for the first time - at least not without trying to enable more verbose logs or checking the browser history, which I didn’t do.

Fortunately, we don’t need it. We can, among other options and combinations:

- Sleep for some seconds close to the difference between Chromium being ready to load the page for the first time and the visualization being ready.
- Bump Chromium startup with a healthcheck, which will guarantee that the website is ready in time. On the other hand, Chromium will only start when the website is ready, which may add an initialization overhead of at least the number of seconds between the graphics being ready and Chromium being ready.

Although the healthcheck may be more elegant, we already did it before with the database. To illustrate how to use a different approach, let’s go with the sleep this time:

```yml
version: "3.9"
services:

  app:
    image: influxdb:2.7.5

  database:
    image: influxdb:2.7.5

  visualization:
    image: grafana/grafana:10.2.3

  graphics:
    image: torizon/weston:3.2.2
    healthcheck:
      test: ["CMD-SHELL", "test", "$$WAYLAND_DISPLAY"]
      start_period: 5s

  gui:
    image: torizon/chromium:3.0.2
    depends_on:
      graphics:
        condition: service_healthy
    entrypoint:
      - /bin/sh
      - -c
      - sleep 30 && /usr/bin/start-browser URL
```

As you can see above, I went with sleep the hard way and decided to add the sleep directly in the Compose file, by overriding the GUI container [entrypoint](https://docs.docker.com/engine/reference/builder/#entrypoint). This is because I think it is cleaner to showcase in this article, although I again highlight that the best idea is to create a separate file.

This time, Chromium took a while more to start and loaded the web app directly, without an ugly “not found“ error. Let’s have one final look at the timings:

![Measurement of container startup timings after the second - and final - attempt to implement a synchronous startup sync](/synchronized-startup-timings-final-attempt.png)
*Figure 6: synchronized startup timings - final attempt*

Video 1 is a speed-up video of the startup in a QEMU machine running Torizon OS on my PC:

{{< youtube s-z2zB9nMYc >}}
*Video 1: successful synchronized startup with QEMU*

Some final observations:

- Due to the screen capture for Video 1 on Wayland heavily affecting the system performance, the app took about 4x longer to start. I was forced to adjust the Chromium sleep, illustrating in practice why sleep is not very elegant and unreliable.
- All measurements here were made with a cold start, where both InfluxDB and Grafana performed several one-time operations. When restarting the containers without deleting storage, startup time is reduced, which may lead to a different analysis especially if using sleep. It may also introduce the need to set additional sync that was not applied until now.
- In addition to everything working from a sync perspective, you might consider adding the “depends_on” and the “restart: always” policies. They might help self-document the dependency chain in the Compose file and make the system more reliable to crashes.

This sample is available as `example2` on [leograba/container-startup-sync](https://github.com/leograba/container-startup-sync).

## Conclusion

In this article, we first acknowledged that startup synchronization is a real issue for Embedded Linux systems that use containers, such as the Torizon OS.

Then, we reviewed that it happens mostly because container startup is not the same as application startup and that the container engine is unaware of sync points by default.

Later on, we evaluated possible ways to add synchronization and tested a few of them in practice, proving their effectiveness, evaluating the best moment to use each of them, and coming across some of their limitations.

Given all of that, now we can summarize our findings in a table - a sort of cheat sheet - to consult whenever we need to add sync into our multi-container apps in the future. This table is opinionated, you may not agree with it, and it may even change depending on your use case. Keep in mind that methods may be combined, especially the “sequential startup” and “always restart” together with other ones.

| Method | Robustness | Easiness | Recommended | When to use |
|---|---|---|---|---|
| Do nothing | ★ | ★★★★★ | Yes | Whenever possible: when you are sure you don’t need container startup sync, don’t overcomplicate things. Remember the KISS principle. |
| Use a single container | ★★★★★ | ★ | No | Never: it is harder and worse than all other methods. |
| Sleep | ★★★ | ★★★★ | No | For quick debugging: this method is not very reliable, but it helps when trying to prove that a startup sync issue is happening. |
| Modify the app | ★★★★★ | ★★★ | Yes | You own the app: making it robust pays off not only for the startup, it also increases the system resilience. |
| Always restart | ★★★★ | ★★★★★ | No | For sync, never; for resilience, always: the other methods are more elegant and guaranteed to work, so avoid using the restart to solve startup issues. That said, always use it in addition to the startup sync, so apps will automatically restart on container crash. |
| Sequential startup | ★★ | ★★★★★ | No | For sync, never; for clarity, always: this method makes things work based on timing and chance, not a very good choice. It helps you and others remember the dependency chain just by looking at the Compose file, so it’s a good idea to use it in addition to the startup sync. |
| Conditional startup | ★★★★★ | ★★★ | Yes | When needed: this is a great method to ensure the dependencies are up and running as expected. |

*Table 1: Multi-container synchronization methods summary*

If you got here, congratulations! I hope this content is helpful for you. I’m also looking forward to your opinion and knowledge sharing: do you employ other methods? On which points do you disagree with this blog post? And last, but not least, see you next time!
