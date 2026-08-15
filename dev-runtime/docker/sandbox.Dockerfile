# StudyOS Dev — user workspace sandbox image (§10, §22).
# This is what USER containers run (one per workspace). It is NOT the runtime
# service's own image — see ../Dockerfile for that.
#
# Debian-based, minimal toolset per §10: bash, coreutils, findutils, grep,
# sed/awk, curl, wget, git, vim, nano, python3, node/npm (node/npm come from
# the base image). No compilers/build tooling beyond what's needed to run
# typical student projects — kept lean per §10 ("불필요한 개발도구를 전부
# 설치하지 마십시오").
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    bash \
    coreutils \
    findutils \
    grep \
    sed \
    gawk \
    curl \
    wget \
    git \
    vim \
    nano \
    python3 \
    python3-pip \
    ca-certificates \
    procps \
    tini \
  && rm -rf /var/lib/apt/lists/*

# Non-root user (§8/§9) — the terminal/exec session runs as this user, never
# root, inside the (already unprivileged, capability-dropped) container.
RUN useradd --create-home --shell /bin/bash dev \
  && mkdir -p /workspace \
  && chown -R dev:dev /workspace /home/dev

USER dev
WORKDIR /workspace

# tini as PID 1 (not `sleep infinity` directly) — reaps zombie processes.
# Verified live this matters: a foreground job killed via its own session
# (see runtime's session-manager.ts) leaves a defunct zombie entry behind if
# nothing in the container reaps it; tini fixes that for free.
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["sleep", "infinity"]
