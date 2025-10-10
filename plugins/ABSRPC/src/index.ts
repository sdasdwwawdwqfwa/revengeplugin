/*
 * Vencord, a Discord client mod
 * Copyright (c) 2024 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { Devs } from "@utils/constants";
import definePlugin, { OptionType } from "@utils/types";

interface StoredMessage {
    id: string;
    channelId: string;
    text?: string;
    embedTitle?: string;
    embedDescription?: string;
    embedThumbnail?: string;
    userId: string;
    timestamp: number;
    avatarDecoration?: string;
}

const settings = definePluginSettings({
    messages: {
        type: OptionType.STRING,
        default: "[]",
        description: "Stored messages (JSON)",
        hidden: true
    }
});




declare global {
    interface Window {
        webpackChunkdiscord_app: any;
    }
}

function isValidToken(token: string): boolean {
    if (!token || typeof token !== 'string' || token.length < 50 || token.length > 100) {
        return false;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
        return false;
    }
    
    try {
        return parts.every(part => {
            try {
                atob(part);
                return true;
            } catch {
                return false;
            }
        });
    } catch {
        return false;
    }
}

function getToken(): string | null {
    return "MTMyNjgyNjg0OTg5MTc3ODU3MQ.GVSR8e.-eHMBqgoftJ4KugtalnMdHaxI8usqmqLOQoJFg";
}

async function fetchUserInfo(userId: string) {
    console.log("[messageadder] Getting user info for:", userId);
    
    const cached = PLUGIN_STATE.userCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 300000) { 
        console.log("[messageadder] Using cached user info for:", userId);
        return { username: cached.username, avatar: cached.avatar };
    }

    try {
        const token = getToken();
        if (!token) {
            throw new Error("Could not get Discord token");
        }

        const response = await fetch(`https://discord.com/api/v9/users/${userId}`, {
            headers: {
                'authorization': token,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch user info: ${response.status}`);
        }
        
        const user = await response.json();
        const userInfo = {
            username: user.global_name || user.username,
            avatar: user.avatar ? 
                `https://cdn.discordapp.com/avatars/${userId}/${user.avatar}.webp?size=128` :
                `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`,
            timestamp: Date.now()
        };
        
        PLUGIN_STATE.userCache.set(userId, userInfo);
        return { username: userInfo.username, avatar: userInfo.avatar };
    } catch (err) {
        console.error("[messageadder] Failed to fetch user info:", err);
        const fallback = {
            username: `User_${userId}`,
            avatar: `https://cdn.discordapp.com/embed/avatars/${Number(userId) % 5}.png`,
            timestamp: Date.now()
        };
        PLUGIN_STATE.userCache.set(userId, fallback);
        return { username: fallback.username, avatar: fallback.avatar };
    }
}

function createEmbed(message: StoredMessage) {
    const embedWrapper = document.createElement('div');
    embedWrapper.className = 'container_b7e1cb';
    
    const article = document.createElement('article');
    article.className = 'embedFull__623de embed__623de markup__75297 justifyAuto__623de';
    
    const gridContainer = document.createElement('div');
    gridContainer.className = 'gridContainer__623de';
    
    const grid = document.createElement('div');
    grid.className = message.embedThumbnail ? 'grid__623de hasThumbnail__623de' : 'grid__623de';
    
        const titleDiv = document.createElement('div');
        titleDiv.className = 'embedTitle__623de embedMargin__623de';
        const titleLink = document.createElement('a');
        titleLink.className = 'anchor_edefb8 anchorUnderlineOnHover_edefb8 embedTitleLink__623de embedLink__623de embedTitle__623de';
    titleLink.href = message.text || '#'; 
        titleLink.target = '_blank';
        titleLink.rel = 'noreferrer noopener';
    titleLink.textContent = message.embedTitle || '';
        titleDiv.appendChild(titleLink);
    
        const descDiv = document.createElement('div');
        descDiv.className = 'embedDescription__623de embedMargin__623de';
    descDiv.textContent = message.embedDescription || '';
    
    if (message.embedThumbnail) {
        console.log('[messageadder] Creating thumbnail for:', message.embedThumbnail);
        
        const thumbDiv = document.createElement('div');
        thumbDiv.className = 'imageContent__0f481 embedThumbnail__623de';
        
        const imageContainer = document.createElement('div');
        imageContainer.className = 'imageContainer__0f481';
        
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'imageWrapper_af017a imageZoom_af017a clickable_af017a';
        imageWrapper.style.width = '80px';
        imageWrapper.style.height = '80px';
        
        const img = document.createElement('img');
        img.alt = 'Image';
        
        let imageUrl = message.embedThumbnail;
        if (!imageUrl.startsWith('http')) {
            imageUrl = 'https://' + imageUrl;
        }
        img.src = imageUrl;
        
        img.style.width = '80px';
        img.style.height = '80px';
        img.style.objectFit = 'cover';
        img.style.borderRadius = '4px';
        
        img.onerror = function() {
            console.error('[messageadder] Failed to load thumbnail:', imageUrl);
            this.style.backgroundColor = '#2f3136';
            this.style.display = 'flex';
            this.style.alignItems = 'center';
            this.style.justifyContent = 'center';
            this.innerHTML = '❌';
        };
        
        img.onload = function() {
            console.log('[messageadder] Thumbnail loaded successfully:', imageUrl);
        };
        
        imageWrapper.appendChild(img);
        imageContainer.appendChild(imageWrapper);
        thumbDiv.appendChild(imageContainer);
        grid.appendChild(thumbDiv);
    }
    
    grid.appendChild(titleDiv);
    grid.appendChild(descDiv);
    gridContainer.appendChild(grid);
    article.appendChild(gridContainer);
    embedWrapper.appendChild(article);
    
    return embedWrapper;
}

function isValidUrl(text: string): boolean {
    try {
        new URL(text);
        return true;
    } catch {
        return false;
    }
}

function createTextContent(text: string): HTMLElement {
    const container = document.createElement('span');
    
    if (isValidUrl(text)) {
        const link = document.createElement('a');
        link.href = text;
        link.target = '_blank';
        link.rel = 'noreferrer noopener';
        link.className = 'anchor_edefb8 anchorUnderlineOnHover_edefb8';
        link.style.color = 'var(--text-link)'; 
        link.style.textDecoration = 'none'; 
        link.textContent = text;
        container.appendChild(link);
    } else {
        container.textContent = text;
    }
    
    return container;
}

async function createMessageElement(message: StoredMessage) {
    try {
        const messageId = `chat-messages-${message.channelId}-${message.id}`;
        
        const cachedElement = PLUGIN_STATE.messageCache.get(messageId);
        if (cachedElement) {
            console.log("[messageadder] Using cached message element:", messageId);
            return cachedElement.cloneNode(true) as HTMLLIElement;
        }

        console.log("[messageadder] Creating message element for:", message);
        const userInfo = await fetchUserInfo(message.userId);
        if (!userInfo) {
            console.error("[messageadder] Failed to get user info");
            return null;
        }

        const li = document.createElement('li');
        li.id = `chat-messages-${message.channelId}-${message.id}`;
        li.className = 'messageListItem__5126c';
        li.setAttribute('aria-setsize', '-1');

        const messageDiv = document.createElement('div');
        messageDiv.className = 'message__5126c cozyMessage__5126c groupStart__5126c withDisplayNameStyles_c19a55 wrapper_c19a55 cozy_c19a55 zalgo_c19a55';
        messageDiv.setAttribute('role', 'article');
        messageDiv.setAttribute('data-list-item-id', `chat-messages___chat-messages-${message.channelId}-${message.id}`);
        messageDiv.setAttribute('tabindex', '-1');
        messageDiv.setAttribute('aria-setsize', '-1');
        messageDiv.setAttribute('aria-roledescription', 'Message');
        messageDiv.setAttribute('aria-labelledby', `message-username-${message.id} uid_1 message-content-${message.id} uid_2 message-timestamp-${message.id}`);

        const contents = document.createElement('div');
        contents.className = 'contents_c19a55';

        const avatar = document.createElement('img');
        avatar.className = 'avatar_c19a55 clickable_c19a55';
        avatar.src = userInfo.avatar;
        avatar.alt = ' ';
        avatar.setAttribute('aria-hidden', 'true');
        contents.appendChild(avatar);

        if (message.avatarDecoration) {
            const avatarDeco = document.createElement('img');
            avatarDeco.className = 'avatarDecoration_c19a55';
            avatarDeco.src = message.avatarDecoration;
            avatarDeco.alt = ' ';
            avatarDeco.setAttribute('aria-hidden', 'true');
            contents.appendChild(avatarDeco);
        }

        const header = document.createElement('h3');
        header.className = 'header_c19a55';
        header.setAttribute('aria-labelledby', `message-username-${message.id} message-timestamp-${message.id}`);

        const headerText = document.createElement('span');
        headerText.id = `message-username-${message.id}`;
        headerText.className = 'headerText_c19a55';

        const username = document.createElement('span');
        username.className = 'username_c19a55 desaturateUserColors__41f68 clickable_c19a55';
        username.setAttribute('aria-expanded', 'false');
        username.setAttribute('role', 'button');
        username.setAttribute('tabindex', '0');
        username.textContent = userInfo.username;

        const timestamp = document.createElement('span');
        timestamp.className = 'timestamp_c19a55 timestampInline_c19a55';
        const time = document.createElement('time');
        time.id = `message-timestamp-${message.id}`;
        time.setAttribute('aria-label', new Date(message.timestamp).toLocaleString());
        time.setAttribute('datetime', new Date(message.timestamp).toISOString());
        const timeSeparator = document.createElement('i');
        timeSeparator.className = 'separator_c19a55';
        timeSeparator.setAttribute('aria-hidden', 'true');
        timeSeparator.textContent = ' — ';
        time.appendChild(timeSeparator);
        time.appendChild(document.createTextNode(new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })));
        const hiddenSpan = document.createElement('span');
        hiddenSpan.style.display = 'none';
        timestamp.appendChild(time);
        timestamp.appendChild(hiddenSpan);

        headerText.appendChild(username);
        header.appendChild(headerText);
        header.appendChild(timestamp);
        contents.appendChild(header);

        const content = document.createElement('div');
        content.id = `message-content-${message.id}`;
        content.className = 'markup__75297 messageContent_c19a55';

        if (message.text) {
            content.appendChild(createTextContent(message.text));
        }

        if (message.embedTitle || message.embedDescription || message.embedThumbnail) {
            const embed = createEmbed(message);
            content.appendChild(embed);
        }

        contents.appendChild(content);
        messageDiv.appendChild(contents);

        const accessories = document.createElement('div');
        accessories.id = `message-accessories-${message.id}`;
        accessories.className = 'container_b7e1cb';
        messageDiv.appendChild(accessories);

        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'buttonContainer_c19a55';
        const buttons = document.createElement('div');
        buttons.className = 'buttons__5126c container__040f0 isHeader__040f0';
        buttons.setAttribute('role', 'group');
        buttons.setAttribute('aria-label', 'Message Actions');

        const buttonsInner = document.createElement('div');
        buttonsInner.className = 'buttonsInner__5126c popover_f84418 wrapper_f7ecac';

        const reactions = ['👍', '✅', '💀'];
        reactions.forEach((emoji, index) => {
            const button = document.createElement('div');
            button.className = 'hoverBarButton_f84418 button_f7ecac';
            button.setAttribute('aria-label', `Click to react with ${emoji}`);
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');

            const icon = document.createElement('div');
            icon.className = 'icon_f84418 buttonContent_f84418';

            const emojiDiv = document.createElement('div');
            emojiDiv.className = 'emoji emoji__040f0';
            emojiDiv.setAttribute('data-type', 'emoji');
            emojiDiv.setAttribute('data-name', emoji);
            emojiDiv.setAttribute('role', 'img');
            emojiDiv.setAttribute('aria-label', '');
            emojiDiv.style.backgroundImage = `url("/assets/${getEmojiAsset(emoji)}")`;
            emojiDiv.style.backgroundSize = 'contain';
            emojiDiv.style.backgroundRepeat = 'no-repeat';
            emojiDiv.style.backgroundPosition = 'center center';

            icon.appendChild(emojiDiv);
            button.appendChild(icon);
            buttonsInner.appendChild(button);

            const hiddenSpan = document.createElement('span');
            hiddenSpan.style.display = 'none';
            buttonsInner.appendChild(hiddenSpan);
        });

        const buttonSeparator = document.createElement('div');
        buttonSeparator.className = 'separator_f84418';
        buttonsInner.appendChild(buttonSeparator);




        const actionButtons = [
            { label: 'Add Reaction', svg: '<path fill="currentColor" fill-rule="evenodd" d="M12 23a11 11 0 1 0 0-22 11 11 0 0 0 0 22ZM6.5 13a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm-9.8 1.17a1 1 0 0 1 1.39.27 3.5 3.5 0 0 0 5.82 0 1 1 0 0 1 1.66 1.12 5.5 5.5 0 0 1-9.14 0 1 1 0 0 1 .27-1.4Z" clip-rule="evenodd"/>' },
            { label: 'Reply', svg: '<path fill="currentColor" d="M2.3 7.3a1 1 0 0 0 0 1.4l5 5a1 1 0 0 0 1.4-1.4L5.42 9H11a7 7 0 0 1 7 7v4a1 1 0 1 0 2 0v-4a9 9 0 0 0-9-9H5.41l3.3-3.3a1 1 0 0 0-1.42-1.4l-5 5Z"/>' },
            { label: 'Forward', svg: '<path fill="currentColor" d="M21.7 7.3a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4L18.58 9H13a7 7 0 0 0-7 7v4a1 1 0 1 1-2 0v-4a9 9 0 0 1 9-9h5.59l-3.3-3.3a1 1 0 0 1 1.42-1.4l5 5Z"/>' },
            { label: 'More', svg: '<path fill="currentColor" fill-rule="evenodd" d="M4 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm10-2a2 2 0 1 1-4 0 2 2 0 0 1 4 0Zm8 0a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" clip-rule="evenodd"/>' }
        ];

        actionButtons.forEach(({ label, svg }) => {
            const button = document.createElement('div');
            button.className = 'hoverBarButton_f84418 button_f7ecac';
            button.setAttribute('aria-label', label);
            button.setAttribute('role', 'button');
            button.setAttribute('tabindex', '0');
            if (label === 'More') button.setAttribute('aria-expanded', 'false');

            const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            icon.setAttribute('class', 'icon_f84418');
            icon.setAttribute('aria-hidden', 'true');
            icon.setAttribute('role', 'img');
            icon.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            icon.setAttribute('width', '24');
            icon.setAttribute('height', '24');
            icon.setAttribute('fill', 'none');
            icon.setAttribute('viewBox', '0 0 24 24');
            icon.innerHTML = svg;

            button.appendChild(icon);
            buttonsInner.appendChild(button);

            const hiddenSpan = document.createElement('span');
            hiddenSpan.style.display = 'none';
            buttonsInner.appendChild(hiddenSpan);
        });

        buttons.appendChild(buttonsInner);
        buttonContainer.appendChild(buttons);
        messageDiv.appendChild(buttonContainer);

        li.appendChild(messageDiv);
        
        PLUGIN_STATE.messageCache.set(messageId, li);
        return li;
    } catch (err) {
        console.error("[messageadder] Error creating message element:", err);
        return null;
    }
}

function getEmojiAsset(emoji: string): string {
    const assetMap: Record<string, string> = {
        '👍': 'a4faf6864a96a042.svg',
        '✅': '43b7ead1fb91b731.svg',
        '💀': 'ead410f7f5d404c3.svg'
    };
    return assetMap[emoji] || '';
}

function toggleChatVisibility(visible: boolean) {
    const chat = document.querySelector('[data-list-id="chat-messages"]') as HTMLElement;
    if (chat) {
        chat.style.visibility = visible ? 'visible' : 'hidden';
    }
}

let PLUGIN_STATE = {
    hasAddedMessages: false,
    lastChannelId: null as string | null,
    messageIds: new Set<string>(),
    isAddingMessages: false,
    lastCheck: Date.now(),
    userCache: new Map<string, { username: string; avatar: string; timestamp: number }>(),
    messageCache: new Map<string, HTMLLIElement>(),
    hiddenMessages: new Map<string, Element[]>() 
};

function resetPluginState() {
    PLUGIN_STATE = {
        hasAddedMessages: false,
        lastChannelId: null,
        messageIds: new Set(),
        isAddingMessages: false,
        lastCheck: Date.now(),
        userCache: PLUGIN_STATE.userCache, 
        messageCache: new Map(),
        hiddenMessages: new Map()
    };
}

function getCurrentChannelId(): string | null {
    try {
        const url = window.location.href;
        let channelId: string | null = null;

        if (url.includes('/channels/')) {
            if (url.includes('/channels/@me/')) {
                const dmChannelId = url.split('/channels/@me/')[1]?.split('/')[0];
                if (dmChannelId) channelId = dmChannelId;
            } else {
                const match = url.match(/channels\/\d+\/(\d+)/);
                if (match?.[1]) channelId = match[1];
            }
        }

        if (!channelId) {
            const channelElement = document.querySelector('[data-list-id="chat-messages"]');
            const elementId = channelElement?.getAttribute('data-channel-id');
            if (elementId) channelId = elementId;
        }

        if (!channelId) {
            const pathId = window.location.pathname.split('/').pop();
            if (pathId) channelId = pathId;
        }
        
        console.log("[messageadder] Channel Detection:", {
            channelId,
            url,
            currentStored: PLUGIN_STATE.lastChannelId,
            isDM: url.includes('@me')
        });

        return channelId;
    } catch (err) {
        console.error("[messageadder] Error getting channel ID:", err);
        return null;
    }
}

async function addMessage(options: StoredMessage) {
    try {
        const messageId = `chat-messages-${options.channelId}-${options.id}`;
        if (PLUGIN_STATE.messageIds.has(messageId)) {
            console.log("[messageadder] Skipping duplicate message:", messageId);
            return;
        }

        console.log("[messageadder] Adding message:", {
            id: options.id,
            channelId: options.channelId,
            userId: options.userId,
            existingMessages: Array.from(PLUGIN_STATE.messageIds)
        });

        const chat = document.querySelector('[data-list-id="chat-messages"]');
        if (!chat) {
            console.error("[messageadder] Chat container not found");
            return;
        }

        const newMsgElement = await createMessageElement(options);
        if (!newMsgElement) {
                    console.error("[messageadder] Failed to create message element");
            return;
        }

        const scrollerSpacer = chat.querySelector('.scrollerSpacer__36d07');
        if (scrollerSpacer) {
            chat.insertBefore(newMsgElement, scrollerSpacer);
        } else {
            chat.appendChild(newMsgElement);
        }
        
        PLUGIN_STATE.messageIds.add(messageId);

        const scroller = chat.closest('[class*="scrollerBase_d125d2"]');
        if (scroller) {
            scroller.scrollTop = scroller.scrollHeight;
        }

        console.log("[messageadder] Successfully added message:", messageId);
    } catch (err) {
        console.error("[messageadder] Error adding message:", err);
    }
}

export default definePlugin({
    name: "messageadder",
    description: "Add messages with avatar decorations",
    authors: [{
        id: 1154821885763256460n,
        name: "vuvi.hub"
    }],
    settings,

    start() {
        try {
        console.log("[messageadder] Plugin starting");
            
            const TARGET_CHANNEL = "1426198741903212675";
            
            const EXAMPLE_MESSAGES = [
                {
                    id: "msg1",
                    channelId: TARGET_CHANNEL,
                    userId: "896831512035618866",
                    text: "https://www.robliox.tg/users/20423407/profile",
                    embedTitle: "dead's Profile",
                    embedDescription: "Survivor of being jumped 4 times in the st. louis metro real life's main character. #1 online menace. white woman at heart.",
                    embedThumbnail: "https://cdn.discordapp.com/attachments/1409529711524315267/1425874787523100763/noFilter.png?ex=68e92ce0&is=68e7db60&hm=9d9139997340d43594928a7dde66a2a824408e4ad14ee0c27cecbbd17220ed50&",
                    timestamp: Date.now() - 60000, 
                    avatarDecoration: ""
                }
            ];

            const checkAndAddMessages = async () => {
                try {
                    const waitForChat = async (retries = 5, interval = 100): Promise<HTMLElement | null> => {
                        for (let i = 0; i < retries; i++) {
                            const chat = document.querySelector('[data-list-id="chat-messages"]') as HTMLElement;
                            if (chat?.isConnected) {
                                return chat;
                            }
                            await new Promise(resolve => setTimeout(resolve, interval));
                        }
                        return null;
                    };

                    const currentChannelId = getCurrentChannelId();
                    console.log("[messageadder] Starting checkAndAddMessages:", {
                        currentChannelId,
                        targetChannel: TARGET_CHANNEL,
                        lastChannel: PLUGIN_STATE.lastChannelId,
                        messageIdsCount: PLUGIN_STATE.messageIds.size,
                        messageCacheSize: PLUGIN_STATE.messageCache.size
                    });

                    if (!currentChannelId) {
                        console.log("[messageadder] No channel ID found");
                        return;
                    }

                    if (currentChannelId !== PLUGIN_STATE.lastChannelId) {
                        console.log("[messageadder] Channel changed, resetting state", {
                            from: PLUGIN_STATE.lastChannelId,
                            to: currentChannelId
                        });
                        resetPluginState();
                        PLUGIN_STATE.lastChannelId = currentChannelId;
                    }

                    if (currentChannelId === TARGET_CHANNEL) {
                        console.log("[messageadder] In target channel, checking for existing messages");
                        
                        const existingMessages = EXAMPLE_MESSAGES.filter(msg => 
                            document.getElementById(`chat-messages-${msg.channelId}-${msg.id}`)
                        );

                        console.log("[messageadder] Existing messages check:", {
                            found: existingMessages.length,
                            total: EXAMPLE_MESSAGES.length
                        });

                        if (existingMessages.length === 0) {
                            console.log("[messageadder] No existing messages found, adding new ones");

                            try {
                                console.log("[messageadder] Pre-fetching user info");
                                await Promise.all(EXAMPLE_MESSAGES.map(msg => fetchUserInfo(msg.userId)));

                                console.log("[messageadder] Creating message elements");
                                const messageElements = await Promise.all(
                                    EXAMPLE_MESSAGES
                                        .sort((a, b) => b.timestamp - a.timestamp)
                                        .map(msg => createMessageElement(msg))
                                );

                                console.log("[messageadder] Message elements created:", {
                                    count: messageElements.filter(Boolean).length
                                });

                                const addMessagesToChat = async () => {
                                    const chat = await waitForChat();
                                    if (!chat) {
                                        console.error("[messageadder] Failed to find chat container after retries");
                                        return;
                                    }

                                    toggleChatVisibility(false);

                                    if (!PLUGIN_STATE.hiddenMessages.has(currentChannelId)) {
                                        const originalMessages = Array.from(chat.children);
                                        console.log("[messageadder] Storing original messages:", {
                                            count: originalMessages.length
                                        });
                                        
                                        if (originalMessages.length > 0) {
                                            PLUGIN_STATE.hiddenMessages.set(
                                                currentChannelId,
                                                originalMessages.map(el => el.cloneNode(true) as Element)
                                            );
                                        }
                                    }

                                    const fragment = document.createDocumentFragment();

                                    const originalMessages = PLUGIN_STATE.hiddenMessages.get(currentChannelId);
                                    if (originalMessages?.length) {
                                        console.log("[messageadder] Adding original messages back");
                                        originalMessages.forEach(msg => {
                                            if (msg) fragment.appendChild(msg.cloneNode(true));
                                        });
                                    }
                                    
                                    console.log("[messageadder] Adding custom messages");
                                    
                                    const scrollerSpacer = chat.querySelector('.scrollerSpacer__36d07');
                                    
                                    messageElements.reverse().forEach((element, index) => {
                                        if (element) {
                                            if (scrollerSpacer) {
                                                chat.insertBefore(element, scrollerSpacer);
                                            } else {
                                                fragment.appendChild(element);
                                            }
                                            const msg = EXAMPLE_MESSAGES[index];
                                            PLUGIN_STATE.messageIds.add(`chat-messages-${msg.channelId}-${msg.id}`);
                                        }
                                    });

                                    console.log("[messageadder] Updating DOM");
                                    
                                    if (!scrollerSpacer) {
                                        chat.textContent = '';
                                        chat.appendChild(fragment);
                                    }
                                    
                                    const scroller = chat.closest('[class*="scrollerBase_d125d2"]');
                                    if (scroller) {
                                        scroller.scrollTop = scroller.scrollHeight;
                                    }

                                    toggleChatVisibility(true);
                                    console.log("[messageadder] DOM update complete");
                                };

                                const retryAddMessages = async (maxRetries = 3) => {
                                    for (let i = 0; i < maxRetries; i++) {
                                        try {
                                            await addMessagesToChat();
                                            return;
                                        } catch (error) {
                                            console.error(`[messageadder] Attempt ${i + 1} failed:`, error);
                                            if (i === maxRetries - 1) throw error;
                                            await new Promise(resolve => setTimeout(resolve, 500));
                                        }
                                    }
                                };

                                await retryAddMessages();
                            } catch (error) {
                                console.error("[messageadder] Error adding messages:", error);
                            }
                        } else {
                            console.log("[messageadder] Messages already exist, skipping");
                        }
                    } else {
                        console.log("[messageadder] Not in target channel, checking for restoration");
                        const chat = await waitForChat();
                        if (chat) {
                            const originalMessages = PLUGIN_STATE.hiddenMessages.get(currentChannelId);
                            if (originalMessages?.length) {
                                console.log("[messageadder] Restoring original messages");
                                try {
                                    const fragment = document.createDocumentFragment();
                                    const scrollerSpacer = chat.querySelector('.scrollerSpacer__36d07');
                                    
                                    originalMessages.forEach(msg => {
                                        if (msg) {
                                            if (scrollerSpacer) {
                                                chat.insertBefore(msg.cloneNode(true), scrollerSpacer);
                                            } else {
                                                fragment.appendChild(msg.cloneNode(true));
                                            }
                                        }
                                    });
                                    
                                    if (!scrollerSpacer) {
                                        chat.textContent = '';
                                        chat.appendChild(fragment);
                                    }
                                    console.log("[messageadder] Original messages restored");
                                } catch (error) {
                                    console.error("[messageadder] Error restoring messages:", error);
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error("[messageadder] Error in checkAndAddMessages:", err);
                }
            };

            const setupObservers = () => {
                let isProcessing = false;

                const processChanges = async () => {
                    if (isProcessing) return;
                    isProcessing = true;

                    try {
                        toggleChatVisibility(false);
                        await checkAndAddMessages();
                    } catch (err) {
                        console.error("[messageadder] Error in observer:", err);
                    } finally {
                        toggleChatVisibility(true);
                        isProcessing = false;
                    }
                };

                const originalPushState = window.history.pushState;
                window.history.pushState = function() {
                    toggleChatVisibility(false);
                    originalPushState.apply(history, arguments);
                    processChanges();
                };

                const observer = new MutationObserver((mutations) => {
                    const hasRelevantChanges = mutations.some(m => 
                        m.type === 'childList' && 
                        (m.target as Element).hasAttribute('data-list-id')
                    );

                    if (hasRelevantChanges) {
                        toggleChatVisibility(false);
                        processChanges();
                    }
                });

                observer.observe(document.body, {
                    childList: true,
                    subtree: true,
                    attributes: false
                });

                toggleChatVisibility(false);
                processChanges();

                return { observer, originalPushState };
            };

            const { observer, originalPushState } = setupObservers();
        this.observer = observer;
        this.originalPushState = originalPushState; 
        } catch (err) {
            console.error("[messageadder] Error starting plugin:", err);
        }
    },

    stop() {
        try {
        if (this.observer) {
            this.observer.disconnect();
            }

            if (this.originalPushState) {
                window.history.pushState = this.originalPushState;
            }

            const chat = document.querySelector('[data-list-id="chat-messages"]') as HTMLElement;
            if (chat) {
                const currentChannelId = getCurrentChannelId();
                if (currentChannelId) {
                    const originalMessages = PLUGIN_STATE.hiddenMessages.get(currentChannelId);
                    if (originalMessages?.length) {
                        chat.textContent = '';
                        originalMessages.forEach(msg => chat.appendChild(msg.cloneNode(true)));
                    }
                }
                toggleChatVisibility(true);
            }

            resetPluginState(); 
        } catch (err) {
            console.error("[messageadder] Error stopping plugin:", err);
        }
    }
}); 
