/*
 * Copyright @ 2017-present Atlassian Pty Ltd
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.jitsi.meet.sdk;

import android.content.Context;
import android.os.Bundle;
import android.support.annotation.NonNull;
import android.support.annotation.Nullable;
import android.util.Log;

import com.facebook.react.bridge.ReadableMap;

import org.jitsi.meet.sdk.invite.InviteController;

import java.lang.reflect.Method;
import java.net.URL;
import java.util.Map;

public class JitsiMeetView
    extends BaseReactView<JitsiMeetViewListener> {

    /**
     * The {@code Method}s of {@code JitsiMeetViewListener} by event name i.e.
     * redux action types.
     */
    private static final Map<String, Method> LISTENER_METHODS
        = ListenerUtils.mapListenerMethods(JitsiMeetViewListener.class);

    /**
     * The {@link Log} tag which identifies the source of the log messages of
     * {@code JitsiMeetView}.
     */
    private static final String TAG = JitsiMeetView.class.getSimpleName();

    /**
     * Loads a specific URL {@code String} in all existing
     * {@code JitsiMeetView}s.
     *
     * @param urlString he URL {@code String} to load in all existing
     * {@code JitsiMeetView}s.
     * @return If the specified {@code urlString} was submitted for loading in
     * at least one {@code JitsiMeetView}, then {@code true}; otherwise,
     * {@code false}.
     */
    public static boolean loadURLStringInViews(String urlString) {
        boolean loaded = false;

        synchronized (views) {
            for (BaseReactView view : views) {
                if (view instanceof JitsiMeetView) {
                    ((JitsiMeetView)view).loadURLString(urlString);
                    loaded = true;
                }
            }
        }

        return loaded;
    }

    /**
     * The default base {@code URL} used to join a conference when a partial URL
     * (e.g. a room name only) is specified to {@link #loadURLString(String)} or
     * {@link #loadURLObject(Bundle)}.
     */
    private URL defaultURL;

    /**
     * The entry point into the invite feature of Jitsi Meet. The Java
     * counterpart of the JavaScript {@code InviteButton}.
     */
    private final InviteController inviteController;

    /**
     * Whether Picture-in-Picture is enabled. If {@code null}, defaults to
     * {@code true} iff the Android platform supports Picture-in-Picture
     * natively.
     */
    private Boolean pictureInPictureEnabled;

    /**
     * The URL of the current conference.
     */
    // XXX Currently, one thread writes and one thread reads, so it should be
    // fine to have this field volatile without additional synchronization.
    private volatile String url;

    /**
     * Whether the Welcome page is enabled.
     */
    private boolean welcomePageEnabled;

    public JitsiMeetView(@NonNull Context context) {
        super(context);

        // The entry point into the invite feature of Jitsi Meet. The Java
        // counterpart of the JavaScript InviteButton.
        inviteController = new InviteController(externalAPIScope);
    }

    /**
     * Enters Picture-In-Picture mode, if possible. This method is designed to
     * be called from the {@code Activity.onUserLeaveHint} method.
     *
     * This is currently not mandatory, but if used will provide automatic
     * handling of the picture in picture mode when user minimizes the app. It
     * will be probably the most useful in case the app is using the welcome
     * page.
     */
    public void enterPictureInPicture() {
        if (isPictureInPictureEnabled() && getURL() != null) {
            PictureInPictureModule pipModule
                = ReactInstanceManagerHolder.getNativeModule(
                PictureInPictureModule.class);

            if (pipModule != null) {
                try {
                    pipModule.enterPictureInPicture();
                } catch (RuntimeException re) {
                    Log.e(TAG, "onUserLeaveHint: failed to enter PiP mode", re);
                }
            }
        }
    }

    /**
     * Gets the default base {@code URL} used to join a conference when a
     * partial URL (e.g. a room name only) is specified to
     * {@link #loadURLString(String)} or {@link #loadURLObject(Bundle)}. If not
     * set or if set to {@code null}, the default built in JavaScript is used:
     * https://meet.jit.si
     *
     * @return The default base {@code URL} or {@code null}.
     */
    public URL getDefaultURL() {
        return defaultURL;
    }

    /**
     * Gets the {@link InviteController} which represents the entry point into
     * the invite feature of Jitsi Meet and is the Java counterpart of the
     * JavaScript {@code InviteButton}.
     *
     * @return the {@link InviteController} which represents the entry point
     * into the invite feature of Jitsi Meet and is the Java counterpart of the
     * JavaScript {@code InviteButton}
     */
    public InviteController getInviteController() {
        return inviteController;
    }

    /**
     * Gets the URL of the current conference.
     *
     * XXX The method is meant for internal purposes only at the time of this
     * writing because there is no equivalent API on iOS.
     *
     * @return the URL {@code String} of the current conference if any;
     * otherwise, {@code null}.
     */
    String getURL() {
        return url;
    }

    /**
     * Gets whether Picture-in-Picture is enabled. Picture-in-Picture is
     * natively supported on Android API >= 26 (Oreo), so it should not be
     * enabled on older platform versions.
     *
     * @return If Picture-in-Picture is enabled, {@code true}; {@code false},
     * otherwise.
     */
    public boolean isPictureInPictureEnabled() {
        return
            PictureInPictureModule.isPictureInPictureSupported()
                && (pictureInPictureEnabled == null
                    || pictureInPictureEnabled);
    }

    /**
     * Gets whether the Welcome page is enabled. If {@code true}, the Welcome
     * page is rendered when this {@code JitsiMeetView} is not at a URL
     * identifying a Jitsi Meet conference/room.
     *
     * @return {@code true} if the Welcome page is enabled; otherwise,
     * {@code false}.
     */
    public boolean isWelcomePageEnabled() {
        return welcomePageEnabled;
    }

    /**
     * Loads a specific {@link URL} which may identify a conference to join. If
     * the specified {@code URL} is {@code null} and the Welcome page is
     * enabled, the Welcome page is displayed instead.
     *
     * @param url The {@code URL} to load which may identify a conference to
     * join.
     */
    public void loadURL(@Nullable URL url) {
        loadURLString(url == null ? null : url.toString());
    }

    /**
     * Loads a specific URL which may identify a conference to join. The URL is
     * specified in the form of a {@link Bundle} of properties which (1)
     * internally are sufficient to construct a URL {@code String} while (2)
     * abstracting the specifics of constructing the URL away from API
     * clients/consumers. If the specified URL is {@code null} and the Welcome
     * page is enabled, the Welcome page is displayed instead.
     *
     * @param urlObject The URL to load which may identify a conference to join.
     */
    public void loadURLObject(@Nullable Bundle urlObject) {
        Bundle props = new Bundle();

        // defaultURL
        if (defaultURL != null) {
            props.putString("defaultURL", defaultURL.toString());
        }

        // inviteController
        InviteController inviteController = getInviteController();

        if (inviteController != null) {
            props.putBoolean(
                "addPeopleEnabled",
                inviteController.isAddPeopleEnabled());
            props.putBoolean(
                "dialOutEnabled",
                inviteController.isDialOutEnabled());
        }

        // pictureInPictureEnabled
        props.putBoolean(
            "pictureInPictureEnabled",
            isPictureInPictureEnabled());

        // url
        if (urlObject != null) {
            props.putBundle("url", urlObject);
        }

        // welcomePageEnabled
        props.putBoolean("welcomePageEnabled", welcomePageEnabled);

        // XXX The method loadURLObject: is supposed to be imperative i.e.
        // a second invocation with one and the same URL is expected to join
        // the respective conference again if the first invocation was followed
        // by leaving the conference. However, React and, respectively,
        // appProperties/initialProperties are declarative expressions i.e. one
        // and the same URL will not trigger componentWillReceiveProps in the
        // JavaScript source code. The workaround implemented bellow introduces
        // imperativeness in React Component props by defining a unique value
        // per loadURLObject: invocation.
        props.putLong("timestamp", System.currentTimeMillis());

        createReactRootView("App", props);
    }

    /**
     * Loads a specific URL {@link String} which may identify a conference to
     * join. If the specified URL {@code String} is {@code null} and the Welcome
     * page is enabled, the Welcome page is displayed instead.
     *
     * @param urlString The URL {@code String} to load which may identify a
     * conference to join.
     */
    public void loadURLString(@Nullable String urlString) {
        Bundle urlObject;

        if (urlString == null) {
            urlObject = null;
        } else {
            urlObject = new Bundle();
            urlObject.putString("url", urlString);
        }
        loadURLObject(urlObject);
    }

    /**
     * The internal processing for the URL of the current conference set on the
     * associated {@link JitsiMeetView}.
     *
     * @param eventName the name of the external API event to be processed
     * @param eventData the details/specifics of the event to process determined
     * by/associated with the specified {@code eventName}.
     */
    private void maybeSetViewURL(String eventName, ReadableMap eventData) {
        switch(eventName) {
        case "CONFERENCE_WILL_JOIN":
            setURL(eventData.getString("url"));
            break;

        case "CONFERENCE_FAILED":
        case "CONFERENCE_WILL_LEAVE":
        case "LOAD_CONFIG_ERROR":
            String url = eventData.getString("url");

            if (url != null && url.equals(getURL())) {
                setURL(null);
            }
            break;
        }
    }

    /**
     * Handler for {@link ExternalAPIModule} events.
     *
     * @param name The name of the event.
     * @param data The details/specifics of the event to send determined
     * by/associated with the specified {@code name}.
     */
    @Override
    public void onExternalAPIEvent(String name, ReadableMap data) {
        // XXX The JitsiMeetView property URL was introduced in order to address
        // an exception in the Picture-in-Picture functionality which arose
        // because of delays related to bridging between JavaScript and Java. To
        // reduce these delays do not wait for the call to be transferred to the
        // UI thread.
        maybeSetViewURL(name, data);

        onExternalAPIEvent(LISTENER_METHODS, name, data);
    }

    /**
     * Sets the default base {@code URL} used to join a conference when a
     * partial URL (e.g. a room name only) is specified to
     * {@link #loadURLString(String)} or {@link #loadURLObject(Bundle)}. Must be
     * called before {@link #loadURL(URL)} for it to take effect.
     *
     * @param defaultURL The {@code URL} to be set as the default base URL.
     * @see #getDefaultURL()
     */
    public void setDefaultURL(URL defaultURL) {
        this.defaultURL = defaultURL;
    }

    /**
     * Sets whether Picture-in-Picture is enabled. Because Picture-in-Picture is
     * natively supported only since certain platform versions, specifying
     * {@code true} will have no effect on unsupported platform versions.
     *
     * @param pictureInPictureEnabled To enable Picture-in-Picture,
     * {@code true}; otherwise, {@code false}.
     */
    public void setPictureInPictureEnabled(boolean pictureInPictureEnabled) {
        this.pictureInPictureEnabled = pictureInPictureEnabled;
    }

    /**
     * Sets the URL of the current conference.
     *
     * XXX The method is meant for internal purposes only. It does not
     * {@code loadURL}, it merely remembers the specified URL.
     *
     * @param url the URL {@code String} which to be set as the URL of the
     * current conference.
     */
    void setURL(String url) {
        this.url = url;
    }

    /**
     * Sets whether the Welcome page is enabled. Must be called before
     * {@link #loadURL(URL)} for it to take effect.
     *
     * @param welcomePageEnabled {@code true} to enable the Welcome page;
     * otherwise, {@code false}.
     */
    public void setWelcomePageEnabled(boolean welcomePageEnabled) {
        this.welcomePageEnabled = welcomePageEnabled;
    }
}
