# Single toolchain image for thingy52-live. Used by VS Code "Reopen in Container",
# by ./project and by GitHub Actions - everything is built and tested here.
FROM debian:trixie-slim

ARG GO_VERSION=1.27.3
ARG NODE_VERSION=26.13.0
ARG ANDROID_CMDLINE_TOOLS=16111833
ARG ANDROID_PLATFORM=android-36
ARG ANDROID_BUILD_TOOLS=36.1.0

ENV DEBIAN_FRONTEND=noninteractive \
    GOPATH=/opt/gopath \
    GOCACHE=/opt/cache/go-build \
    GOMODCACHE=/opt/gopath/pkg/mod \
    GRADLE_USER_HOME=/opt/cache/gradle \
    ANDROID_HOME=/opt/android-sdk \
    JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
ENV PATH=/usr/local/go/bin:/opt/gopath/bin:/opt/node/bin:/opt/android-sdk/cmdline-tools/latest/bin:/opt/android-sdk/platform-tools:$PATH

# --- base -------------------------------------------------------------------
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates curl git unzip xz-utils make jq openjdk-21-jdk-headless chromium \
    && rm -rf /var/lib/apt/lists/*

# --- Go (bridge) ------------------------------------------------------------
RUN curl -fsSL https://go.dev/dl/go${GO_VERSION}.linux-amd64.tar.gz | tar -C /usr/local -xz \
    && go install honnef.co/go/tools/cmd/staticcheck@latest

# --- Node (web dashboard tests) ---------------------------------------------
RUN curl -fsSL https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz \
      | tar -xJ -C /opt && mv /opt/node-v${NODE_VERSION}-linux-x64 /opt/node
ENV CHROME_BIN=/usr/bin/chromium

# --- Android SDK (app) ------------------------------------------------------
RUN mkdir -p $ANDROID_HOME/cmdline-tools \
    && curl -fsSL -o /tmp/clt.zip https://dl.google.com/android/repository/commandlinetools-linux-${ANDROID_CMDLINE_TOOLS}_latest.zip \
    && unzip -q /tmp/clt.zip -d $ANDROID_HOME/cmdline-tools && mv $ANDROID_HOME/cmdline-tools/cmdline-tools $ANDROID_HOME/cmdline-tools/latest \
    && rm /tmp/clt.zip \
    && yes | sdkmanager --licenses >/dev/null \
    && sdkmanager --install "platform-tools" "platforms;${ANDROID_PLATFORM}" "build-tools;${ANDROID_BUILD_TOOLS}" >/dev/null

RUN mkdir -p /opt/cache && chmod -R a+rwX /opt/cache /opt/gopath $ANDROID_HOME
WORKDIR /workspace
