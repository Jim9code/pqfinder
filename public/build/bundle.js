
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function stop_propagation(fn) {
        return function (event) {
            event.stopPropagation();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function init_binding_group(group) {
        let _inputs;
        return {
            /* push */ p(...inputs) {
                _inputs = inputs;
                _inputs.forEach(input => group.push(input));
            },
            /* remove */ r() {
                _inputs.forEach(input => group.splice(group.indexOf(input), 1));
            }
        };
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value, mounting) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        if (!mounting || value !== undefined) {
            select.selectedIndex = -1; // no option should be selected
        }
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked');
        return selected_option && selected_option.__value;
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\components\LandingPage.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$5 = "src\\components\\LandingPage.svelte";

    // (104:0) {#if showLoginModal}
    function create_if_block_1$4(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let h3;
    	let t1;
    	let button0;
    	let t3;
    	let div2;
    	let p0;
    	let t5;
    	let button1;
    	let span0;
    	let t7;
    	let span1;
    	let t9;
    	let div1;
    	let p1;
    	let t10;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "🔑 Sign In";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "×";
    			t3 = space();
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "Sign in to access your past questions and continue learning";
    			t5 = space();
    			button1 = element("button");
    			span0 = element("span");
    			span0.textContent = "🔍";
    			t7 = space();
    			span1 = element("span");
    			span1.textContent = "Continue with Google";
    			t9 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t10 = text("Don't have an account? ");
    			button2 = element("button");
    			button2.textContent = "Sign up";
    			attr_dev(h3, "class", "svelte-1iznbt5");
    			add_location(h3, file$5, 107, 4, 2790);
    			attr_dev(button0, "class", "modal-close svelte-1iznbt5");
    			add_location(button0, file$5, 108, 4, 2815);
    			attr_dev(div0, "class", "modal-header svelte-1iznbt5");
    			add_location(div0, file$5, 106, 3, 2758);
    			attr_dev(p0, "class", "auth-description svelte-1iznbt5");
    			add_location(p0, file$5, 112, 4, 2927);
    			attr_dev(span0, "class", "google-icon svelte-1iznbt5");
    			add_location(span0, file$5, 115, 5, 3112);
    			attr_dev(span1, "class", "google-text svelte-1iznbt5");
    			add_location(span1, file$5, 116, 5, 3154);
    			attr_dev(button1, "class", "google-auth-btn svelte-1iznbt5");
    			add_location(button1, file$5, 114, 4, 3030);
    			attr_dev(button2, "class", "link-btn svelte-1iznbt5");
    			add_location(button2, file$5, 120, 31, 3292);
    			attr_dev(p1, "class", "svelte-1iznbt5");
    			add_location(p1, file$5, 120, 5, 3266);
    			attr_dev(div1, "class", "auth-footer svelte-1iznbt5");
    			add_location(div1, file$5, 119, 4, 3234);
    			attr_dev(div2, "class", "modal-body svelte-1iznbt5");
    			add_location(div2, file$5, 111, 3, 2897);
    			attr_dev(div3, "class", "modal-content auth-modal svelte-1iznbt5");
    			add_location(div3, file$5, 105, 2, 2690);
    			attr_dev(div4, "class", "modal-overlay svelte-1iznbt5");
    			add_location(div4, file$5, 104, 1, 2636);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t5);
    			append_dev(div2, button1);
    			append_dev(button1, span0);
    			append_dev(button1, t7);
    			append_dev(button1, span1);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t10);
    			append_dev(p1, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*closeModals*/ ctx[4], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_2*/ ctx[8], false, false, false, false),
    					listen_dev(button2, "click", /*openSignupModal*/ ctx[3], false, false, false, false),
    					listen_dev(div3, "click", stop_propagation(/*click_handler*/ ctx[7]), false, false, true, false),
    					listen_dev(div4, "click", /*closeModals*/ ctx[4], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$4.name,
    		type: "if",
    		source: "(104:0) {#if showLoginModal}",
    		ctx
    	});

    	return block;
    }

    // (129:0) {#if showSignupModal}
    function create_if_block$5(ctx) {
    	let div4;
    	let div3;
    	let div0;
    	let h3;
    	let t1;
    	let button0;
    	let t3;
    	let div2;
    	let p0;
    	let t5;
    	let button1;
    	let span0;
    	let t7;
    	let span1;
    	let t9;
    	let div1;
    	let p1;
    	let t10;
    	let button2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "🚀 Get Started";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "×";
    			t3 = space();
    			div2 = element("div");
    			p0 = element("p");
    			p0.textContent = "Create your account and start accessing past questions";
    			t5 = space();
    			button1 = element("button");
    			span0 = element("span");
    			span0.textContent = "🔍";
    			t7 = space();
    			span1 = element("span");
    			span1.textContent = "Sign up with Google";
    			t9 = space();
    			div1 = element("div");
    			p1 = element("p");
    			t10 = text("Already have an account? ");
    			button2 = element("button");
    			button2.textContent = "Sign in";
    			attr_dev(h3, "class", "svelte-1iznbt5");
    			add_location(h3, file$5, 132, 4, 3618);
    			attr_dev(button0, "class", "modal-close svelte-1iznbt5");
    			add_location(button0, file$5, 133, 4, 3647);
    			attr_dev(div0, "class", "modal-header svelte-1iznbt5");
    			add_location(div0, file$5, 131, 3, 3586);
    			attr_dev(p0, "class", "auth-description svelte-1iznbt5");
    			add_location(p0, file$5, 137, 4, 3759);
    			attr_dev(span0, "class", "google-icon svelte-1iznbt5");
    			add_location(span0, file$5, 140, 5, 3940);
    			attr_dev(span1, "class", "google-text svelte-1iznbt5");
    			add_location(span1, file$5, 141, 5, 3982);
    			attr_dev(button1, "class", "google-auth-btn svelte-1iznbt5");
    			add_location(button1, file$5, 139, 4, 3857);
    			attr_dev(button2, "class", "link-btn svelte-1iznbt5");
    			add_location(button2, file$5, 145, 33, 4121);
    			attr_dev(p1, "class", "svelte-1iznbt5");
    			add_location(p1, file$5, 145, 5, 4093);
    			attr_dev(div1, "class", "auth-footer svelte-1iznbt5");
    			add_location(div1, file$5, 144, 4, 4061);
    			attr_dev(div2, "class", "modal-body svelte-1iznbt5");
    			add_location(div2, file$5, 136, 3, 3729);
    			attr_dev(div3, "class", "modal-content auth-modal svelte-1iznbt5");
    			add_location(div3, file$5, 130, 2, 3518);
    			attr_dev(div4, "class", "modal-overlay svelte-1iznbt5");
    			add_location(div4, file$5, 129, 1, 3464);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div3);
    			append_dev(div3, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, p0);
    			append_dev(div2, t5);
    			append_dev(div2, button1);
    			append_dev(button1, span0);
    			append_dev(button1, t7);
    			append_dev(button1, span1);
    			append_dev(div2, t9);
    			append_dev(div2, div1);
    			append_dev(div1, p1);
    			append_dev(p1, t10);
    			append_dev(p1, button2);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*closeModals*/ ctx[4], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_3*/ ctx[9], false, false, false, false),
    					listen_dev(button2, "click", /*openLoginModal*/ ctx[2], false, false, false, false),
    					listen_dev(div3, "click", stop_propagation(/*click_handler_1*/ ctx[6]), false, false, true, false),
    					listen_dev(div4, "click", /*closeModals*/ ctx[4], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$5.name,
    		type: "if",
    		source: "(129:0) {#if showSignupModal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div14;
    	let div2;
    	let div1;
    	let h1;
    	let span0;
    	let t1;
    	let t2;
    	let p0;
    	let t4;
    	let p1;
    	let t6;
    	let div0;
    	let button0;
    	let span1;
    	let t8;
    	let t9;
    	let button1;
    	let span2;
    	let t11;
    	let t12;
    	let div11;
    	let div10;
    	let h20;
    	let t14;
    	let div9;
    	let div4;
    	let div3;
    	let t16;
    	let h30;
    	let t18;
    	let p2;
    	let t20;
    	let div6;
    	let div5;
    	let t22;
    	let h31;
    	let t24;
    	let p3;
    	let t26;
    	let div8;
    	let div7;
    	let t28;
    	let h32;
    	let t30;
    	let p4;
    	let t32;
    	let div13;
    	let div12;
    	let h21;
    	let t34;
    	let p5;
    	let t36;
    	let button2;
    	let span3;
    	let t38;
    	let t39;
    	let t40;
    	let if_block1_anchor;
    	let mounted;
    	let dispose;
    	let if_block0 = /*showLoginModal*/ ctx[0] && create_if_block_1$4(ctx);
    	let if_block1 = /*showSignupModal*/ ctx[1] && create_if_block$5(ctx);

    	const block = {
    		c: function create() {
    			div14 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			h1 = element("h1");
    			span0 = element("span");
    			span0.textContent = "📚";
    			t1 = text("\r\n\t\t\t\tPQ Finder");
    			t2 = space();
    			p0 = element("p");
    			p0.textContent = "Find and share past questions from universities across Nigeria";
    			t4 = space();
    			p1 = element("p");
    			p1.textContent = "Connect with fellow students, access quality study materials, and excel in your exams";
    			t6 = space();
    			div0 = element("div");
    			button0 = element("button");
    			span1 = element("span");
    			span1.textContent = "🚀";
    			t8 = text("\r\n\t\t\t\t\tGet Started");
    			t9 = space();
    			button1 = element("button");
    			span2 = element("span");
    			span2.textContent = "🔑";
    			t11 = text("\r\n\t\t\t\t\tSign In");
    			t12 = space();
    			div11 = element("div");
    			div10 = element("div");
    			h20 = element("h2");
    			h20.textContent = "Why Choose PQ Finder?";
    			t14 = space();
    			div9 = element("div");
    			div4 = element("div");
    			div3 = element("div");
    			div3.textContent = "📖";
    			t16 = space();
    			h30 = element("h3");
    			h30.textContent = "Quality Content";
    			t18 = space();
    			p2 = element("p");
    			p2.textContent = "Access verified past questions from top Nigerian universities";
    			t20 = space();
    			div6 = element("div");
    			div5 = element("div");
    			div5.textContent = "👥";
    			t22 = space();
    			h31 = element("h3");
    			h31.textContent = "Student Community";
    			t24 = space();
    			p3 = element("p");
    			p3.textContent = "Connect with fellow students and share knowledge";
    			t26 = space();
    			div8 = element("div");
    			div7 = element("div");
    			div7.textContent = "⚡";
    			t28 = space();
    			h32 = element("h3");
    			h32.textContent = "Quick Access";
    			t30 = space();
    			p4 = element("p");
    			p4.textContent = "Find and download past questions in seconds";
    			t32 = space();
    			div13 = element("div");
    			div12 = element("div");
    			h21 = element("h2");
    			h21.textContent = "Ready to Ace Your Exams?";
    			t34 = space();
    			p5 = element("p");
    			p5.textContent = "Join thousands of students who are already using PQ Finder";
    			t36 = space();
    			button2 = element("button");
    			span3 = element("span");
    			span3.textContent = "🎓";
    			t38 = text("\r\n\t\t\t\tStart Learning Today");
    			t39 = space();
    			if (if_block0) if_block0.c();
    			t40 = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    			attr_dev(span0, "class", "hero-icon svelte-1iznbt5");
    			add_location(span0, file$5, 42, 4, 887);
    			attr_dev(h1, "class", "hero-title svelte-1iznbt5");
    			add_location(h1, file$5, 41, 3, 858);
    			attr_dev(p0, "class", "hero-subtitle svelte-1iznbt5");
    			add_location(p0, file$5, 45, 3, 950);
    			attr_dev(p1, "class", "hero-description svelte-1iznbt5");
    			add_location(p1, file$5, 48, 3, 1057);
    			add_location(span1, file$5, 54, 5, 1293);
    			attr_dev(button0, "class", "btn btn-primary svelte-1iznbt5");
    			add_location(button0, file$5, 53, 4, 1227);
    			add_location(span2, file$5, 58, 5, 1414);
    			attr_dev(button1, "class", "btn btn-secondary svelte-1iznbt5");
    			add_location(button1, file$5, 57, 4, 1347);
    			attr_dev(div0, "class", "hero-actions svelte-1iznbt5");
    			add_location(div0, file$5, 52, 3, 1195);
    			attr_dev(div1, "class", "hero-content svelte-1iznbt5");
    			add_location(div1, file$5, 40, 2, 827);
    			attr_dev(div2, "class", "hero-section svelte-1iznbt5");
    			add_location(div2, file$5, 39, 1, 797);
    			attr_dev(h20, "class", "section-title svelte-1iznbt5");
    			add_location(h20, file$5, 68, 3, 1583);
    			attr_dev(div3, "class", "feature-icon svelte-1iznbt5");
    			add_location(div3, file$5, 71, 5, 1706);
    			attr_dev(h30, "class", "svelte-1iznbt5");
    			add_location(h30, file$5, 72, 5, 1747);
    			attr_dev(p2, "class", "svelte-1iznbt5");
    			add_location(p2, file$5, 73, 5, 1778);
    			attr_dev(div4, "class", "feature-card svelte-1iznbt5");
    			add_location(div4, file$5, 70, 4, 1673);
    			attr_dev(div5, "class", "feature-icon svelte-1iznbt5");
    			add_location(div5, file$5, 76, 5, 1897);
    			attr_dev(h31, "class", "svelte-1iznbt5");
    			add_location(h31, file$5, 77, 5, 1938);
    			attr_dev(p3, "class", "svelte-1iznbt5");
    			add_location(p3, file$5, 78, 5, 1971);
    			attr_dev(div6, "class", "feature-card svelte-1iznbt5");
    			add_location(div6, file$5, 75, 4, 1864);
    			attr_dev(div7, "class", "feature-icon svelte-1iznbt5");
    			add_location(div7, file$5, 81, 5, 2077);
    			attr_dev(h32, "class", "svelte-1iznbt5");
    			add_location(h32, file$5, 82, 5, 2117);
    			attr_dev(p4, "class", "svelte-1iznbt5");
    			add_location(p4, file$5, 83, 5, 2145);
    			attr_dev(div8, "class", "feature-card svelte-1iznbt5");
    			add_location(div8, file$5, 80, 4, 2044);
    			attr_dev(div9, "class", "features-grid svelte-1iznbt5");
    			add_location(div9, file$5, 69, 3, 1640);
    			attr_dev(div10, "class", "container svelte-1iznbt5");
    			add_location(div10, file$5, 67, 2, 1555);
    			attr_dev(div11, "class", "features-section svelte-1iznbt5");
    			add_location(div11, file$5, 66, 1, 1521);
    			attr_dev(h21, "class", "svelte-1iznbt5");
    			add_location(h21, file$5, 92, 3, 2322);
    			attr_dev(p5, "class", "svelte-1iznbt5");
    			add_location(p5, file$5, 93, 3, 2360);
    			add_location(span3, file$5, 95, 4, 2505);
    			attr_dev(button2, "class", "btn btn-primary btn-large svelte-1iznbt5");
    			add_location(button2, file$5, 94, 3, 2430);
    			attr_dev(div12, "class", "container svelte-1iznbt5");
    			add_location(div12, file$5, 91, 2, 2294);
    			attr_dev(div13, "class", "cta-section svelte-1iznbt5");
    			add_location(div13, file$5, 90, 1, 2265);
    			attr_dev(div14, "class", "landing-page svelte-1iznbt5");
    			add_location(div14, file$5, 37, 0, 744);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div2);
    			append_dev(div2, div1);
    			append_dev(div1, h1);
    			append_dev(h1, span0);
    			append_dev(h1, t1);
    			append_dev(div1, t2);
    			append_dev(div1, p0);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(div1, t6);
    			append_dev(div1, div0);
    			append_dev(div0, button0);
    			append_dev(button0, span1);
    			append_dev(button0, t8);
    			append_dev(div0, t9);
    			append_dev(div0, button1);
    			append_dev(button1, span2);
    			append_dev(button1, t11);
    			append_dev(div14, t12);
    			append_dev(div14, div11);
    			append_dev(div11, div10);
    			append_dev(div10, h20);
    			append_dev(div10, t14);
    			append_dev(div10, div9);
    			append_dev(div9, div4);
    			append_dev(div4, div3);
    			append_dev(div4, t16);
    			append_dev(div4, h30);
    			append_dev(div4, t18);
    			append_dev(div4, p2);
    			append_dev(div9, t20);
    			append_dev(div9, div6);
    			append_dev(div6, div5);
    			append_dev(div6, t22);
    			append_dev(div6, h31);
    			append_dev(div6, t24);
    			append_dev(div6, p3);
    			append_dev(div9, t26);
    			append_dev(div9, div8);
    			append_dev(div8, div7);
    			append_dev(div8, t28);
    			append_dev(div8, h32);
    			append_dev(div8, t30);
    			append_dev(div8, p4);
    			append_dev(div14, t32);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, h21);
    			append_dev(div12, t34);
    			append_dev(div12, p5);
    			append_dev(div12, t36);
    			append_dev(div12, button2);
    			append_dev(button2, span3);
    			append_dev(button2, t38);
    			insert_dev(target, t39, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t40, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*openSignupModal*/ ctx[3], false, false, false, false),
    					listen_dev(button1, "click", /*openLoginModal*/ ctx[2], false, false, false, false),
    					listen_dev(button2, "click", /*openSignupModal*/ ctx[3], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*showLoginModal*/ ctx[0]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$4(ctx);
    					if_block0.c();
    					if_block0.m(t40.parentNode, t40);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*showSignupModal*/ ctx[1]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$5(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div14);
    			if (detaching) detach_dev(t39);
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t40);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LandingPage', slots, []);
    	const dispatch = createEventDispatcher();
    	let showLoginModal = false;
    	let showSignupModal = false;

    	function openLoginModal() {
    		$$invalidate(0, showLoginModal = true);
    		$$invalidate(1, showSignupModal = false);
    	}

    	function openSignupModal() {
    		$$invalidate(1, showSignupModal = true);
    		$$invalidate(0, showLoginModal = false);
    	}

    	function closeModals() {
    		$$invalidate(0, showLoginModal = false);
    		$$invalidate(1, showSignupModal = false);
    	}

    	function handleGoogleAuth(type) {
    		// Simulate Google authentication
    		console.log(`Google ${type} clicked`);

    		// Close modals and dispatch login event
    		closeModals();

    		dispatch('userLogin', {
    			name: 'John Doe',
    			email: 'john@example.com',
    			avatar: '👤'
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<LandingPage> was created with unknown prop '${key}'`);
    	});

    	function click_handler_1(event) {
    		bubble.call(this, $$self, event);
    	}

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const click_handler_2 = () => handleGoogleAuth('Login');
    	const click_handler_3 = () => handleGoogleAuth('Signup');

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		showLoginModal,
    		showSignupModal,
    		openLoginModal,
    		openSignupModal,
    		closeModals,
    		handleGoogleAuth
    	});

    	$$self.$inject_state = $$props => {
    		if ('showLoginModal' in $$props) $$invalidate(0, showLoginModal = $$props.showLoginModal);
    		if ('showSignupModal' in $$props) $$invalidate(1, showSignupModal = $$props.showSignupModal);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		showLoginModal,
    		showSignupModal,
    		openLoginModal,
    		openSignupModal,
    		closeModals,
    		handleGoogleAuth,
    		click_handler_1,
    		click_handler,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class LandingPage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LandingPage",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\components\NavHeader.svelte generated by Svelte v3.59.2 */
    const file$4 = "src\\components\\NavHeader.svelte";

    // (66:3) {:else}
    function create_else_block$4(ctx) {
    	let button;
    	let span;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			span = element("span");
    			span.textContent = "🔑";
    			t1 = text("\r\n\t\t\t\t\tSign In");
    			add_location(span, file$4, 67, 5, 1704);
    			attr_dev(button, "class", "login-btn svelte-19ofluw");
    			add_location(button, file$4, 66, 4, 1633);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[8], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$4.name,
    		type: "else",
    		source: "(66:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (54:3) {#if user}
    function create_if_block$4(ctx) {
    	let div4;
    	let div0;
    	let t0_value = (/*user*/ ctx[1].avatar || '👤') + "";
    	let t0;
    	let t1;
    	let div3;
    	let div1;
    	let t2_value = /*user*/ ctx[1].name + "";
    	let t2;
    	let t3;
    	let div2;
    	let t4;
    	let t5_value = (/*user*/ ctx[1].balance || 0) + "";
    	let t5;
    	let t6;
    	let button;
    	let span;
    	let t8;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			t4 = text("₦");
    			t5 = text(t5_value);
    			t6 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "🚪";
    			t8 = text("\r\n\t\t\t\t\tLogout");
    			attr_dev(div0, "class", "user-avatar svelte-19ofluw");
    			add_location(div0, file$4, 55, 5, 1296);
    			attr_dev(div1, "class", "user-name svelte-19ofluw");
    			add_location(div1, file$4, 57, 6, 1389);
    			attr_dev(div2, "class", "user-balance svelte-19ofluw");
    			add_location(div2, file$4, 58, 6, 1437);
    			attr_dev(div3, "class", "user-details svelte-19ofluw");
    			add_location(div3, file$4, 56, 5, 1355);
    			attr_dev(div4, "class", "user-info svelte-19ofluw");
    			add_location(div4, file$4, 54, 4, 1266);
    			add_location(span, file$4, 62, 5, 1572);
    			attr_dev(button, "class", "logout-btn svelte-19ofluw");
    			add_location(button, file$4, 61, 4, 1520);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, t4);
    			append_dev(div2, t5);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    			append_dev(button, t8);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*logout*/ ctx[4], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*user*/ 2 && t0_value !== (t0_value = (/*user*/ ctx[1].avatar || '👤') + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*user*/ 2 && t2_value !== (t2_value = /*user*/ ctx[1].name + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*user*/ 2 && t5_value !== (t5_value = (/*user*/ ctx[1].balance || 0) + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$4.name,
    		type: "if",
    		source: "(54:3) {#if user}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let nav;
    	let div3;
    	let div0;
    	let span0;
    	let t1;
    	let span1;
    	let t3;
    	let div1;
    	let button0;
    	let span2;
    	let t5;
    	let span3;
    	let t7;
    	let button1;
    	let span4;
    	let t9;
    	let span5;
    	let t11;
    	let button2;
    	let span6;
    	let t13;
    	let span7;
    	let t15;
    	let div2;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*user*/ ctx[1]) return create_if_block$4;
    		return create_else_block$4;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			div3 = element("div");
    			div0 = element("div");
    			span0 = element("span");
    			span0.textContent = "📚";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "PQ Finder";
    			t3 = space();
    			div1 = element("div");
    			button0 = element("button");
    			span2 = element("span");
    			span2.textContent = "🔍";
    			t5 = space();
    			span3 = element("span");
    			span3.textContent = "Browse";
    			t7 = space();
    			button1 = element("button");
    			span4 = element("span");
    			span4.textContent = "📤";
    			t9 = space();
    			span5 = element("span");
    			span5.textContent = "Upload";
    			t11 = space();
    			button2 = element("button");
    			span6 = element("span");
    			span6.textContent = "💳";
    			t13 = space();
    			span7 = element("span");
    			span7.textContent = "Wallet";
    			t15 = space();
    			div2 = element("div");
    			if_block.c();
    			attr_dev(span0, "class", "brand-icon svelte-19ofluw");
    			add_location(span0, file$4, 21, 3, 413);
    			attr_dev(span1, "class", "brand-text svelte-19ofluw");
    			add_location(span1, file$4, 22, 3, 452);
    			attr_dev(div0, "class", "nav-brand svelte-19ofluw");
    			add_location(div0, file$4, 20, 2, 385);
    			attr_dev(span2, "class", "nav-icon svelte-19ofluw");
    			add_location(span2, file$4, 31, 4, 669);
    			attr_dev(span3, "class", "nav-text svelte-19ofluw");
    			add_location(span3, file$4, 32, 4, 707);
    			attr_dev(button0, "class", "nav-link svelte-19ofluw");
    			toggle_class(button0, "active", /*currentView*/ ctx[0] === 'browse');
    			add_location(button0, file$4, 26, 3, 537);
    			attr_dev(span4, "class", "nav-icon svelte-19ofluw");
    			add_location(span4, file$4, 39, 4, 894);
    			attr_dev(span5, "class", "nav-text svelte-19ofluw");
    			add_location(span5, file$4, 40, 4, 932);
    			attr_dev(button1, "class", "nav-link svelte-19ofluw");
    			toggle_class(button1, "active", /*currentView*/ ctx[0] === 'upload');
    			add_location(button1, file$4, 34, 3, 762);
    			attr_dev(span6, "class", "nav-icon svelte-19ofluw");
    			add_location(span6, file$4, 47, 4, 1119);
    			attr_dev(span7, "class", "nav-text svelte-19ofluw");
    			add_location(span7, file$4, 48, 4, 1157);
    			attr_dev(button2, "class", "nav-link svelte-19ofluw");
    			toggle_class(button2, "active", /*currentView*/ ctx[0] === 'wallet');
    			add_location(button2, file$4, 42, 3, 987);
    			attr_dev(div1, "class", "nav-links svelte-19ofluw");
    			add_location(div1, file$4, 25, 2, 509);
    			attr_dev(div2, "class", "nav-user svelte-19ofluw");
    			add_location(div2, file$4, 52, 2, 1223);
    			attr_dev(div3, "class", "nav-container svelte-19ofluw");
    			add_location(div3, file$4, 19, 1, 354);
    			attr_dev(nav, "class", "nav-header svelte-19ofluw");
    			add_location(nav, file$4, 18, 0, 327);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, div3);
    			append_dev(div3, div0);
    			append_dev(div0, span0);
    			append_dev(div0, t1);
    			append_dev(div0, span1);
    			append_dev(div3, t3);
    			append_dev(div3, div1);
    			append_dev(div1, button0);
    			append_dev(button0, span2);
    			append_dev(button0, t5);
    			append_dev(button0, span3);
    			append_dev(div1, t7);
    			append_dev(div1, button1);
    			append_dev(button1, span4);
    			append_dev(button1, t9);
    			append_dev(button1, span5);
    			append_dev(div1, t11);
    			append_dev(div1, button2);
    			append_dev(button2, span6);
    			append_dev(button2, t13);
    			append_dev(button2, span7);
    			append_dev(div3, t15);
    			append_dev(div3, div2);
    			if_block.m(div2, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[5], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[7], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button0, "active", /*currentView*/ ctx[0] === 'browse');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button1, "active", /*currentView*/ ctx[0] === 'upload');
    			}

    			if (dirty & /*currentView*/ 1) {
    				toggle_class(button2, "active", /*currentView*/ ctx[0] === 'wallet');
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div2, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('NavHeader', slots, []);
    	const dispatch = createEventDispatcher();
    	let { user = null } = $$props;
    	let { currentView = 'browse' } = $$props;

    	function switchView(view) {
    		$$invalidate(0, currentView = view);
    		dispatch('viewChange', view);
    	}

    	function logout() {
    		dispatch('logout');
    	}

    	const writable_props = ['user', 'currentView'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<NavHeader> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => switchView('browse');
    	const click_handler_1 = () => switchView('upload');
    	const click_handler_2 = () => switchView('wallet');
    	const click_handler_3 = () => dispatch('showAuth');

    	$$self.$$set = $$props => {
    		if ('user' in $$props) $$invalidate(1, user = $$props.user);
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		user,
    		currentView,
    		switchView,
    		logout
    	});

    	$$self.$inject_state = $$props => {
    		if ('user' in $$props) $$invalidate(1, user = $$props.user);
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentView,
    		user,
    		dispatch,
    		switchView,
    		logout,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3
    	];
    }

    class NavHeader extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { user: 1, currentView: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "NavHeader",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get user() {
    		throw new Error("<NavHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set user(value) {
    		throw new Error("<NavHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get currentView() {
    		throw new Error("<NavHeader>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set currentView(value) {
    		throw new Error("<NavHeader>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\UploadComponent.svelte generated by Svelte v3.59.2 */
    const file$3 = "src\\components\\UploadComponent.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[38] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[41] = list[i];
    	return child_ctx;
    }

    function get_each_context_2$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[44] = list[i];
    	return child_ctx;
    }

    function get_each_context_3$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[47] = list[i];
    	child_ctx[49] = i;
    	return child_ctx;
    }

    // (201:2) {:else}
    function create_else_block$3(ctx) {
    	let div1;
    	let div0;
    	let t0;
    	let div2;
    	let t1;
    	let div4;
    	let t2;
    	let div3;
    	let t3;
    	let each_value_3 = /*steps*/ ctx[12];
    	validate_each_argument(each_value_3);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks[i] = create_each_block_3$1(get_each_context_3$1(ctx, each_value_3, i));
    	}

    	function select_block_type_2(ctx, dirty) {
    		if (/*currentStep*/ ctx[7] === 1) return create_if_block_4$2;
    		if (/*currentStep*/ ctx[7] === 2) return create_if_block_6$1;
    		if (/*currentStep*/ ctx[7] === 3) return create_if_block_7;
    	}

    	let current_block_type = select_block_type_2(ctx);
    	let if_block0 = current_block_type && current_block_type(ctx);
    	let if_block1 = /*currentStep*/ ctx[7] > 1 && create_if_block_3$3(ctx);

    	function select_block_type_4(ctx, dirty) {
    		if (/*currentStep*/ ctx[7] < 3) return create_if_block_1$3;
    		return create_else_block_1$2;
    	}

    	let current_block_type_1 = select_block_type_4(ctx);
    	let if_block2 = current_block_type_1(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t0 = space();
    			div2 = element("div");
    			if (if_block0) if_block0.c();
    			t1 = space();
    			div4 = element("div");
    			if (if_block1) if_block1.c();
    			t2 = space();
    			div3 = element("div");
    			t3 = space();
    			if_block2.c();
    			attr_dev(div0, "class", "steps-progress svelte-1fdt9px");
    			add_location(div0, file$3, 203, 4, 5029);
    			attr_dev(div1, "class", "steps-container svelte-1fdt9px");
    			add_location(div1, file$3, 202, 3, 4994);
    			attr_dev(div2, "class", "step-content svelte-1fdt9px");
    			add_location(div2, file$3, 228, 3, 5695);
    			attr_dev(div3, "class", "nav-spacer svelte-1fdt9px");
    			add_location(div3, file$3, 394, 4, 11208);
    			attr_dev(div4, "class", "step-navigation svelte-1fdt9px");
    			add_location(div4, file$3, 386, 3, 11014);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}

    			insert_dev(target, t0, anchor);
    			insert_dev(target, div2, anchor);
    			if (if_block0) if_block0.m(div2, null);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div4, anchor);
    			if (if_block1) if_block1.m(div4, null);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			append_dev(div4, t3);
    			if_block2.m(div4, null);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*currentStep, steps, goToStep*/ 528512) {
    				each_value_3 = /*steps*/ ctx[12];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3$1(ctx, each_value_3, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_3$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_3.length;
    			}

    			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if (if_block0) if_block0.d(1);
    				if_block0 = current_block_type && current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div2, null);
    				}
    			}

    			if (/*currentStep*/ ctx[7] > 1) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$3(ctx);
    					if_block1.c();
    					if_block1.m(div4, t2);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (current_block_type_1 === (current_block_type_1 = select_block_type_4(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type_1(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div4, null);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(div2);

    			if (if_block0) {
    				if_block0.d();
    			}

    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(div4);
    			if (if_block1) if_block1.d();
    			if_block2.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$3.name,
    		type: "else",
    		source: "(201:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (190:2) {#if uploadSuccess}
    function create_if_block$3(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let t1;
    	let h3;
    	let t3;
    	let p;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "🎉";
    			t1 = space();
    			h3 = element("h3");
    			h3.textContent = "Upload Successful!";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Your file has been uploaded successfully!";
    			t5 = space();
    			button = element("button");
    			button.textContent = "Upload Another File";
    			attr_dev(div0, "class", "success-icon svelte-1fdt9px");
    			add_location(div0, file$3, 192, 5, 4683);
    			attr_dev(h3, "class", "svelte-1fdt9px");
    			add_location(h3, file$3, 193, 5, 4724);
    			attr_dev(p, "class", "svelte-1fdt9px");
    			add_location(p, file$3, 194, 5, 4758);
    			attr_dev(button, "class", "btn btn-success");
    			add_location(button, file$3, 195, 5, 4813);
    			attr_dev(div1, "class", "success-content svelte-1fdt9px");
    			add_location(div1, file$3, 191, 4, 4647);
    			attr_dev(div2, "class", "success-modal svelte-1fdt9px");
    			add_location(div2, file$3, 190, 3, 4614);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			append_dev(div1, h3);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    			append_dev(div1, t5);
    			append_dev(div1, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[27], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(190:2) {#if uploadSuccess}",
    		ctx
    	});

    	return block;
    }

    // (215:8) {:else}
    function create_else_block_4(ctx) {
    	let t_value = /*step*/ ctx[47].number + "";
    	let t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_4.name,
    		type: "else",
    		source: "(215:8) {:else}",
    		ctx
    	});

    	return block;
    }

    // (213:8) {#if currentStep > step.number}
    function create_if_block_9(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("✓");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_9.name,
    		type: "if",
    		source: "(213:8) {#if currentStep > step.number}",
    		ctx
    	});

    	return block;
    }

    // (205:5) {#each steps as step, index}
    function create_each_block_3$1(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div3;
    	let div1;
    	let t1_value = /*step*/ ctx[47].title + "";
    	let t1;
    	let t2;
    	let div2;
    	let t3_value = /*step*/ ctx[47].description + "";
    	let t3;
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type_1(ctx, dirty) {
    		if (/*currentStep*/ ctx[7] > /*step*/ ctx[47].number) return create_if_block_9;
    		return create_else_block_4;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[28](/*step*/ ctx[47]);
    	}

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			if_block.c();
    			t0 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			div2 = element("div");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(div0, "class", "step-number svelte-1fdt9px");
    			add_location(div0, file$3, 211, 7, 5299);
    			attr_dev(div1, "class", "step-title svelte-1fdt9px");
    			add_location(div1, file$3, 219, 8, 5490);
    			attr_dev(div2, "class", "step-description svelte-1fdt9px");
    			add_location(div2, file$3, 220, 8, 5542);
    			attr_dev(div3, "class", "step-info svelte-1fdt9px");
    			add_location(div3, file$3, 218, 7, 5457);
    			attr_dev(div4, "class", "step-item svelte-1fdt9px");
    			toggle_class(div4, "active", /*currentStep*/ ctx[7] === /*step*/ ctx[47].number);
    			toggle_class(div4, "completed", /*currentStep*/ ctx[7] > /*step*/ ctx[47].number);
    			add_location(div4, file$3, 205, 6, 5100);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			if_block.m(div0, null);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, t1);
    			append_dev(div3, t2);
    			append_dev(div3, div2);
    			append_dev(div2, t3);
    			append_dev(div4, t4);

    			if (!mounted) {
    				dispose = listen_dev(div4, "click", click_handler_1, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty[0] & /*currentStep, steps*/ 4224) {
    				toggle_class(div4, "active", /*currentStep*/ ctx[7] === /*step*/ ctx[47].number);
    			}

    			if (dirty[0] & /*currentStep, steps*/ 4224) {
    				toggle_class(div4, "completed", /*currentStep*/ ctx[7] > /*step*/ ctx[47].number);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3$1.name,
    		type: "each",
    		source: "(205:5) {#each steps as step, index}",
    		ctx
    	});

    	return block;
    }

    // (334:32) 
    function create_if_block_7(ctx) {
    	let div12;
    	let h3;
    	let t1;
    	let p0;
    	let t3;
    	let div8;
    	let div3;
    	let div0;
    	let t4_value = getFileIcon$1(/*selectedFile*/ ctx[0]?.type) + "";
    	let t4;
    	let t5;
    	let div1;
    	let h4;
    	let t6_value = /*selectedFile*/ ctx[0]?.name + "";
    	let t6;
    	let t7;
    	let p1;
    	let t8_value = formatFileSize$1(/*selectedFile*/ ctx[0]?.size) + "";
    	let t8;
    	let t9;
    	let div2;
    	let t11;
    	let div7;
    	let div4;
    	let span0;
    	let t13;
    	let span1;
    	let t14;
    	let t15;
    	let div5;
    	let span2;
    	let t17;
    	let span3;
    	let t18;
    	let t19;
    	let div6;
    	let span4;
    	let t21;
    	let span5;
    	let t22;
    	let t23;
    	let t24;
    	let div11;
    	let div9;
    	let span6;
    	let t26;
    	let span7;
    	let t28;
    	let div10;
    	let span8;
    	let t30;
    	let span9;
    	let if_block = /*description*/ ctx[4] && create_if_block_8(ctx);

    	const block = {
    		c: function create() {
    			div12 = element("div");
    			h3 = element("h3");
    			h3.textContent = "🔍 Review & Upload";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Review your file details before uploading";
    			t3 = space();
    			div8 = element("div");
    			div3 = element("div");
    			div0 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div1 = element("div");
    			h4 = element("h4");
    			t6 = text(t6_value);
    			t7 = space();
    			p1 = element("p");
    			t8 = text(t8_value);
    			t9 = space();
    			div2 = element("div");
    			div2.textContent = "FREE";
    			t11 = space();
    			div7 = element("div");
    			div4 = element("div");
    			span0 = element("span");
    			span0.textContent = "Subject:";
    			t13 = space();
    			span1 = element("span");
    			t14 = text(/*subject*/ ctx[1]);
    			t15 = space();
    			div5 = element("div");
    			span2 = element("span");
    			span2.textContent = "Year:";
    			t17 = space();
    			span3 = element("span");
    			t18 = text(/*year*/ ctx[2]);
    			t19 = space();
    			div6 = element("div");
    			span4 = element("span");
    			span4.textContent = "Type:";
    			t21 = space();
    			span5 = element("span");
    			t22 = text(/*examType*/ ctx[3]);
    			t23 = space();
    			if (if_block) if_block.c();
    			t24 = space();
    			div11 = element("div");
    			div9 = element("div");
    			span6 = element("span");
    			span6.textContent = "File Status:";
    			t26 = space();
    			span7 = element("span");
    			span7.textContent = "FREE for all students";
    			t28 = space();
    			div10 = element("div");
    			span8 = element("span");
    			span8.textContent = "Purpose:";
    			t30 = space();
    			span9 = element("span");
    			span9.textContent = "Help fellow students succeed";
    			attr_dev(h3, "class", "svelte-1fdt9px");
    			add_location(h3, file$3, 336, 6, 9340);
    			attr_dev(p0, "class", "svelte-1fdt9px");
    			add_location(p0, file$3, 337, 6, 9375);
    			attr_dev(div0, "class", "review-file-icon svelte-1fdt9px");
    			add_location(div0, file$3, 341, 8, 9510);
    			attr_dev(h4, "class", "svelte-1fdt9px");
    			add_location(h4, file$3, 343, 9, 9630);
    			attr_dev(p1, "class", "svelte-1fdt9px");
    			add_location(p1, file$3, 344, 9, 9670);
    			attr_dev(div1, "class", "review-file-info svelte-1fdt9px");
    			add_location(div1, file$3, 342, 8, 9589);
    			attr_dev(div2, "class", "review-price svelte-1fdt9px");
    			add_location(div2, file$3, 346, 8, 9739);
    			attr_dev(div3, "class", "review-header svelte-1fdt9px");
    			add_location(div3, file$3, 340, 7, 9473);
    			attr_dev(span0, "class", "detail-label svelte-1fdt9px");
    			add_location(span0, file$3, 351, 9, 9884);
    			attr_dev(span1, "class", "detail-value svelte-1fdt9px");
    			add_location(span1, file$3, 352, 9, 9937);
    			attr_dev(div4, "class", "review-detail svelte-1fdt9px");
    			add_location(div4, file$3, 350, 8, 9846);
    			attr_dev(span2, "class", "detail-label svelte-1fdt9px");
    			add_location(span2, file$3, 355, 9, 10044);
    			attr_dev(span3, "class", "detail-value svelte-1fdt9px");
    			add_location(span3, file$3, 356, 9, 10094);
    			attr_dev(div5, "class", "review-detail svelte-1fdt9px");
    			add_location(div5, file$3, 354, 8, 10006);
    			attr_dev(span4, "class", "detail-label svelte-1fdt9px");
    			add_location(span4, file$3, 359, 9, 10198);
    			attr_dev(span5, "class", "detail-value svelte-1fdt9px");
    			add_location(span5, file$3, 360, 9, 10248);
    			attr_dev(div6, "class", "review-detail svelte-1fdt9px");
    			add_location(div6, file$3, 358, 8, 10160);
    			attr_dev(div7, "class", "review-details svelte-1fdt9px");
    			add_location(div7, file$3, 349, 7, 9808);
    			attr_dev(div8, "class", "review-card svelte-1fdt9px");
    			add_location(div8, file$3, 339, 6, 9439);
    			attr_dev(span6, "class", "summary-label svelte-1fdt9px");
    			add_location(span6, file$3, 373, 8, 10630);
    			attr_dev(span7, "class", "summary-value svelte-1fdt9px");
    			add_location(span7, file$3, 374, 8, 10687);
    			attr_dev(div9, "class", "summary-item svelte-1fdt9px");
    			add_location(div9, file$3, 372, 7, 10594);
    			attr_dev(span8, "class", "summary-label svelte-1fdt9px");
    			add_location(span8, file$3, 377, 8, 10803);
    			attr_dev(span9, "class", "summary-value svelte-1fdt9px");
    			add_location(span9, file$3, 378, 8, 10856);
    			attr_dev(div10, "class", "summary-item svelte-1fdt9px");
    			add_location(div10, file$3, 376, 7, 10767);
    			attr_dev(div11, "class", "upload-summary svelte-1fdt9px");
    			add_location(div11, file$3, 371, 6, 10557);
    			attr_dev(div12, "class", "step-panel svelte-1fdt9px");
    			add_location(div12, file$3, 335, 5, 9308);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div12, anchor);
    			append_dev(div12, h3);
    			append_dev(div12, t1);
    			append_dev(div12, p0);
    			append_dev(div12, t3);
    			append_dev(div12, div8);
    			append_dev(div8, div3);
    			append_dev(div3, div0);
    			append_dev(div0, t4);
    			append_dev(div3, t5);
    			append_dev(div3, div1);
    			append_dev(div1, h4);
    			append_dev(h4, t6);
    			append_dev(div1, t7);
    			append_dev(div1, p1);
    			append_dev(p1, t8);
    			append_dev(div3, t9);
    			append_dev(div3, div2);
    			append_dev(div8, t11);
    			append_dev(div8, div7);
    			append_dev(div7, div4);
    			append_dev(div4, span0);
    			append_dev(div4, t13);
    			append_dev(div4, span1);
    			append_dev(span1, t14);
    			append_dev(div7, t15);
    			append_dev(div7, div5);
    			append_dev(div5, span2);
    			append_dev(div5, t17);
    			append_dev(div5, span3);
    			append_dev(span3, t18);
    			append_dev(div7, t19);
    			append_dev(div7, div6);
    			append_dev(div6, span4);
    			append_dev(div6, t21);
    			append_dev(div6, span5);
    			append_dev(span5, t22);
    			append_dev(div7, t23);
    			if (if_block) if_block.m(div7, null);
    			append_dev(div12, t24);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			append_dev(div9, span6);
    			append_dev(div9, t26);
    			append_dev(div9, span7);
    			append_dev(div11, t28);
    			append_dev(div11, div10);
    			append_dev(div10, span8);
    			append_dev(div10, t30);
    			append_dev(div10, span9);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFile*/ 1 && t4_value !== (t4_value = getFileIcon$1(/*selectedFile*/ ctx[0]?.type) + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*selectedFile*/ 1 && t6_value !== (t6_value = /*selectedFile*/ ctx[0]?.name + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*selectedFile*/ 1 && t8_value !== (t8_value = formatFileSize$1(/*selectedFile*/ ctx[0]?.size) + "")) set_data_dev(t8, t8_value);
    			if (dirty[0] & /*subject*/ 2) set_data_dev(t14, /*subject*/ ctx[1]);
    			if (dirty[0] & /*year*/ 4) set_data_dev(t18, /*year*/ ctx[2]);
    			if (dirty[0] & /*examType*/ 8) set_data_dev(t22, /*examType*/ ctx[3]);

    			if (/*description*/ ctx[4]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_8(ctx);
    					if_block.c();
    					if_block.m(div7, null);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div12);
    			if (if_block) if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_7.name,
    		type: "if",
    		source: "(334:32) ",
    		ctx
    	});

    	return block;
    }

    // (275:32) 
    function create_if_block_6$1(ctx) {
    	let div6;
    	let h3;
    	let t1;
    	let p;
    	let t3;
    	let div5;
    	let div0;
    	let label0;
    	let t5;
    	let select0;
    	let option0;
    	let t7;
    	let div1;
    	let label1;
    	let t9;
    	let select1;
    	let option1;
    	let t11;
    	let div3;
    	let label2;
    	let t13;
    	let div2;
    	let t14;
    	let div4;
    	let label3;
    	let t16;
    	let textarea;
    	let mounted;
    	let dispose;
    	let each_value_2 = /*subjects*/ ctx[10];
    	validate_each_argument(each_value_2);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_2[i] = create_each_block_2$1(get_each_context_2$1(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*years*/ ctx[11];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$2(get_each_context_1$2(ctx, each_value_1, i));
    	}

    	let each_value = /*examTypes*/ ctx[9];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div6 = element("div");
    			h3 = element("h3");
    			h3.textContent = "📝 Add File Details";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Provide information about your past question";
    			t3 = space();
    			div5 = element("div");
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Subject *";
    			t5 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "Choose a subject";

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t7 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Academic Year *";
    			t9 = space();
    			select1 = element("select");
    			option1 = element("option");
    			option1.textContent = "Select year";

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t11 = space();
    			div3 = element("div");
    			label2 = element("label");
    			label2.textContent = "Exam Type *";
    			t13 = space();
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t14 = space();
    			div4 = element("div");
    			label3 = element("label");
    			label3.textContent = "Description (Optional)";
    			t16 = space();
    			textarea = element("textarea");
    			attr_dev(h3, "class", "svelte-1fdt9px");
    			add_location(h3, file$3, 277, 6, 7357);
    			attr_dev(p, "class", "svelte-1fdt9px");
    			add_location(p, file$3, 278, 6, 7393);
    			attr_dev(label0, "for", "subject");
    			add_location(label0, file$3, 282, 8, 7526);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 284, 9, 7636);
    			attr_dev(select0, "id", "subject");
    			select0.required = true;
    			if (/*subject*/ ctx[1] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[31].call(select0));
    			add_location(select0, file$3, 283, 8, 7574);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$3, 281, 7, 7492);
    			attr_dev(label1, "for", "year");
    			add_location(label1, file$3, 292, 8, 7885);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 294, 9, 7992);
    			attr_dev(select1, "id", "year");
    			select1.required = true;
    			if (/*year*/ ctx[2] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[32].call(select1));
    			add_location(select1, file$3, 293, 8, 7936);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$3, 291, 7, 7851);
    			attr_dev(label2, "for", "examType");
    			add_location(label2, file$3, 302, 8, 8224);
    			attr_dev(div2, "class", "exam-type-grid svelte-1fdt9px");
    			add_location(div2, file$3, 303, 8, 8275);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$3, 301, 7, 8190);
    			attr_dev(label3, "for", "description");
    			add_location(label3, file$3, 322, 8, 8903);
    			attr_dev(textarea, "id", "description");
    			attr_dev(textarea, "placeholder", "Add any additional details about the exam, topics covered, or special notes...");
    			attr_dev(textarea, "rows", "3");
    			add_location(textarea, file$3, 323, 8, 8968);
    			attr_dev(div4, "class", "form-group full-width svelte-1fdt9px");
    			add_location(div4, file$3, 321, 7, 8858);
    			attr_dev(div5, "class", "form-grid svelte-1fdt9px");
    			add_location(div5, file$3, 280, 6, 7460);
    			attr_dev(div6, "class", "step-panel svelte-1fdt9px");
    			add_location(div6, file$3, 276, 5, 7325);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div6, anchor);
    			append_dev(div6, h3);
    			append_dev(div6, t1);
    			append_dev(div6, p);
    			append_dev(div6, t3);
    			append_dev(div6, div5);
    			append_dev(div5, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t5);
    			append_dev(div0, select0);
    			append_dev(select0, option0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*subject*/ ctx[1], true);
    			append_dev(div5, t7);
    			append_dev(div5, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t9);
    			append_dev(div1, select1);
    			append_dev(select1, option1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*year*/ ctx[2], true);
    			append_dev(div5, t11);
    			append_dev(div5, div3);
    			append_dev(div3, label2);
    			append_dev(div3, t13);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div2, null);
    				}
    			}

    			append_dev(div5, t14);
    			append_dev(div5, div4);
    			append_dev(div4, label3);
    			append_dev(div4, t16);
    			append_dev(div4, textarea);
    			set_input_value(textarea, /*description*/ ctx[4]);

    			if (!mounted) {
    				dispose = [
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[31]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[32]),
    					listen_dev(textarea, "input", /*textarea_input_handler*/ ctx[35])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*subjects*/ 1024) {
    				each_value_2 = /*subjects*/ ctx[10];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2$1(ctx, each_value_2, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_2$1(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_2.length;
    			}

    			if (dirty[0] & /*subject, subjects*/ 1026) {
    				select_option(select0, /*subject*/ ctx[1]);
    			}

    			if (dirty[0] & /*years*/ 2048) {
    				each_value_1 = /*years*/ ctx[11];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$2(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty[0] & /*year, years*/ 2052) {
    				select_option(select1, /*year*/ ctx[2]);
    			}

    			if (dirty[0] & /*examType, examTypes*/ 520) {
    				each_value = /*examTypes*/ ctx[9];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*description*/ 16) {
    				set_input_value(textarea, /*description*/ ctx[4]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div6);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6$1.name,
    		type: "if",
    		source: "(275:32) ",
    		ctx
    	});

    	return block;
    }

    // (230:4) {#if currentStep === 1}
    function create_if_block_4$2(ctx) {
    	let div1;
    	let h3;
    	let t1;
    	let p;
    	let t3;
    	let div0;
    	let input;
    	let t4;
    	let mounted;
    	let dispose;

    	function select_block_type_3(ctx, dirty) {
    		if (/*selectedFile*/ ctx[0]) return create_if_block_5$1;
    		return create_else_block_3;
    	}

    	let current_block_type = select_block_type_3(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "📁 Select Your File";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Choose the past question file you want to upload";
    			t3 = space();
    			div0 = element("div");
    			input = element("input");
    			t4 = space();
    			if_block.c();
    			attr_dev(h3, "class", "svelte-1fdt9px");
    			add_location(h3, file$3, 232, 6, 5827);
    			attr_dev(p, "class", "svelte-1fdt9px");
    			add_location(p, file$3, 233, 6, 5863);
    			attr_dev(input, "id", "fileInput");
    			attr_dev(input, "type", "file");
    			attr_dev(input, "accept", ".pdf,.doc,.docx,.jpg,.jpeg,.png");
    			attr_dev(input, "class", "file-input-hidden svelte-1fdt9px");
    			add_location(input, file$3, 242, 7, 6128);
    			attr_dev(div0, "class", "file-drop-zone svelte-1fdt9px");
    			toggle_class(div0, "drag-over", /*dragOver*/ ctx[8]);
    			add_location(div0, file$3, 235, 6, 5934);
    			attr_dev(div1, "class", "step-panel svelte-1fdt9px");
    			add_location(div1, file$3, 231, 5, 5795);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			append_dev(div1, t1);
    			append_dev(div1, p);
    			append_dev(div1, t3);
    			append_dev(div1, div0);
    			append_dev(div0, input);
    			append_dev(div0, t4);
    			if_block.m(div0, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "change", /*handleFileSelect*/ ctx[13], false, false, false, false),
    					listen_dev(div0, "dragover", /*handleDragOver*/ ctx[14], false, false, false, false),
    					listen_dev(div0, "dragleave", /*handleDragLeave*/ ctx[15], false, false, false, false),
    					listen_dev(div0, "drop", /*handleDrop*/ ctx[16], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_3(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div0, null);
    				}
    			}

    			if (dirty[0] & /*dragOver*/ 256) {
    				toggle_class(div0, "drag-over", /*dragOver*/ ctx[8]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$2.name,
    		type: "if",
    		source: "(230:4) {#if currentStep === 1}",
    		ctx
    	});

    	return block;
    }

    // (363:8) {#if description}
    function create_if_block_8(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;
    	let t2;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "Description:";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(/*description*/ ctx[4]);
    			attr_dev(span0, "class", "detail-label svelte-1fdt9px");
    			add_location(span0, file$3, 364, 9, 10383);
    			attr_dev(span1, "class", "detail-value svelte-1fdt9px");
    			add_location(span1, file$3, 365, 9, 10440);
    			attr_dev(div, "class", "review-detail svelte-1fdt9px");
    			add_location(div, file$3, 363, 8, 10345);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*description*/ 16) set_data_dev(t2, /*description*/ ctx[4]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_8.name,
    		type: "if",
    		source: "(363:8) {#if description}",
    		ctx
    	});

    	return block;
    }

    // (286:9) {#each subjects as subjectOption}
    function create_each_block_2$1(ctx) {
    	let option;
    	let t_value = /*subjectOption*/ ctx[44] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*subjectOption*/ ctx[44];
    			option.value = option.__value;
    			add_location(option, file$3, 286, 10, 7734);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2$1.name,
    		type: "each",
    		source: "(286:9) {#each subjects as subjectOption}",
    		ctx
    	});

    	return block;
    }

    // (296:9) {#each years as yearOption}
    function create_each_block_1$2(ctx) {
    	let option;
    	let t_value = /*yearOption*/ ctx[41] + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*yearOption*/ ctx[41];
    			option.value = option.__value;
    			add_location(option, file$3, 296, 10, 8079);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$2.name,
    		type: "each",
    		source: "(296:9) {#each years as yearOption}",
    		ctx
    	});

    	return block;
    }

    // (305:9) {#each examTypes as type}
    function create_each_block$2(ctx) {
    	let label;
    	let input;
    	let t0;
    	let div;
    	let span0;
    	let t1_value = /*type*/ ctx[38].icon + "";
    	let t1;
    	let t2;
    	let span1;
    	let t3_value = /*type*/ ctx[38].label + "";
    	let t3;
    	let t4;
    	let binding_group;
    	let mounted;
    	let dispose;
    	binding_group = init_binding_group(/*$$binding_groups*/ ctx[34][0]);

    	const block = {
    		c: function create() {
    			label = element("label");
    			input = element("input");
    			t0 = space();
    			div = element("div");
    			span0 = element("span");
    			t1 = text(t1_value);
    			t2 = space();
    			span1 = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			attr_dev(input, "type", "radio");
    			input.__value = /*type*/ ctx[38].value;
    			input.value = input.__value;
    			attr_dev(input, "class", "exam-type-input svelte-1fdt9px");
    			add_location(input, file$3, 306, 11, 8437);
    			attr_dev(span0, "class", "exam-type-icon svelte-1fdt9px");
    			add_location(span0, file$3, 313, 12, 8649);
    			attr_dev(span1, "class", "exam-type-label svelte-1fdt9px");
    			add_location(span1, file$3, 314, 12, 8710);
    			attr_dev(div, "class", "exam-type-content svelte-1fdt9px");
    			add_location(div, file$3, 312, 11, 8604);
    			attr_dev(label, "class", "exam-type-option svelte-1fdt9px");
    			toggle_class(label, "selected", /*examType*/ ctx[3] === /*type*/ ctx[38].value);
    			add_location(label, file$3, 305, 10, 8351);
    			binding_group.p(input);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label, anchor);
    			append_dev(label, input);
    			input.checked = input.__value === /*examType*/ ctx[3];
    			append_dev(label, t0);
    			append_dev(label, div);
    			append_dev(div, span0);
    			append_dev(span0, t1);
    			append_dev(div, t2);
    			append_dev(div, span1);
    			append_dev(span1, t3);
    			append_dev(label, t4);

    			if (!mounted) {
    				dispose = listen_dev(input, "change", /*input_change_handler*/ ctx[33]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*examType*/ 8) {
    				input.checked = input.__value === /*examType*/ ctx[3];
    			}

    			if (dirty[0] & /*examType, examTypes*/ 520) {
    				toggle_class(label, "selected", /*examType*/ ctx[3] === /*type*/ ctx[38].value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label);
    			binding_group.r();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(305:9) {#each examTypes as type}",
    		ctx
    	});

    	return block;
    }

    // (262:7) {:else}
    function create_else_block_3(ctx) {
    	let div2;
    	let div0;
    	let t1;
    	let h4;
    	let t3;
    	let p;
    	let t4;
    	let button;
    	let t6;
    	let div1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			div0.textContent = "📁";
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "Drop your file here";
    			t3 = space();
    			p = element("p");
    			t4 = text("or ");
    			button = element("button");
    			button.textContent = "browse files";
    			t6 = space();
    			div1 = element("div");
    			div1.textContent = "Supported: PDF, DOC, DOCX, JPG, PNG";
    			attr_dev(div0, "class", "drop-icon svelte-1fdt9px");
    			add_location(div0, file$3, 263, 9, 6882);
    			attr_dev(h4, "class", "svelte-1fdt9px");
    			add_location(h4, file$3, 264, 9, 6924);
    			attr_dev(button, "class", "browse-btn svelte-1fdt9px");
    			add_location(button, file$3, 265, 15, 6969);
    			attr_dev(p, "class", "svelte-1fdt9px");
    			add_location(p, file$3, 265, 9, 6963);
    			attr_dev(div1, "class", "supported-formats svelte-1fdt9px");
    			add_location(div1, file$3, 266, 9, 7094);
    			attr_dev(div2, "class", "file-drop-content svelte-1fdt9px");
    			add_location(div2, file$3, 262, 8, 6840);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div2, t1);
    			append_dev(div2, h4);
    			append_dev(div2, t3);
    			append_dev(div2, p);
    			append_dev(p, t4);
    			append_dev(p, button);
    			append_dev(div2, t6);
    			append_dev(div2, div1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_3*/ ctx[30], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_3.name,
    		type: "else",
    		source: "(262:7) {:else}",
    		ctx
    	});

    	return block;
    }

    // (251:7) {#if selectedFile}
    function create_if_block_5$1(ctx) {
    	let div4;
    	let div0;
    	let t0_value = getFileIcon$1(/*selectedFile*/ ctx[0].type) + "";
    	let t0;
    	let t1;
    	let div3;
    	let div1;
    	let t2_value = /*selectedFile*/ ctx[0].name + "";
    	let t2;
    	let t3;
    	let div2;
    	let t4_value = formatFileSize$1(/*selectedFile*/ ctx[0].size) + "";
    	let t4;
    	let t5;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div3 = element("div");
    			div1 = element("div");
    			t2 = text(t2_value);
    			t3 = space();
    			div2 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			button = element("button");
    			button.textContent = "Change File";
    			attr_dev(div0, "class", "file-icon svelte-1fdt9px");
    			add_location(div0, file$3, 252, 9, 6399);
    			attr_dev(div1, "class", "file-name svelte-1fdt9px");
    			add_location(div1, file$3, 254, 10, 6509);
    			attr_dev(div2, "class", "file-size svelte-1fdt9px");
    			add_location(div2, file$3, 255, 10, 6569);
    			attr_dev(div3, "class", "file-details svelte-1fdt9px");
    			add_location(div3, file$3, 253, 9, 6471);
    			attr_dev(button, "class", "change-file-btn svelte-1fdt9px");
    			add_location(button, file$3, 257, 9, 6661);
    			attr_dev(div4, "class", "file-selected svelte-1fdt9px");
    			add_location(div4, file$3, 251, 8, 6361);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div0, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div3);
    			append_dev(div3, div1);
    			append_dev(div1, t2);
    			append_dev(div3, t3);
    			append_dev(div3, div2);
    			append_dev(div2, t4);
    			append_dev(div4, t5);
    			append_dev(div4, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler_2*/ ctx[29], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFile*/ 1 && t0_value !== (t0_value = getFileIcon$1(/*selectedFile*/ ctx[0].type) + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*selectedFile*/ 1 && t2_value !== (t2_value = /*selectedFile*/ ctx[0].name + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*selectedFile*/ 1 && t4_value !== (t4_value = formatFileSize$1(/*selectedFile*/ ctx[0].size) + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5$1.name,
    		type: "if",
    		source: "(251:7) {#if selectedFile}",
    		ctx
    	});

    	return block;
    }

    // (388:4) {#if currentStep > 1}
    function create_if_block_3$3(ctx) {
    	let button;
    	let span;
    	let t1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			span = element("span");
    			span.textContent = "←";
    			t1 = text("\r\n\t\t\t\t\t\tPrevious");
    			add_location(span, file$3, 389, 6, 11139);
    			attr_dev(button, "class", "btn btn-secondary");
    			add_location(button, file$3, 388, 5, 11077);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, span);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*prevStep*/ ctx[18], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$3.name,
    		type: "if",
    		source: "(388:4) {#if currentStep > 1}",
    		ctx
    	});

    	return block;
    }

    // (406:4) {:else}
    function create_else_block_1$2(ctx) {
    	let button;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	function select_block_type_5(ctx, dirty) {
    		if (/*uploading*/ ctx[5]) return create_if_block_2$3;
    		return create_else_block_2;
    	}

    	let current_block_type = select_block_type_5(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			button = element("button");
    			if_block.c();
    			attr_dev(button, "class", "btn btn-success upload-btn svelte-1fdt9px");
    			button.disabled = button_disabled_value = /*uploading*/ ctx[5] || !/*canUpload*/ ctx[22]();
    			add_location(button, file$3, 406, 5, 11455);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			if_block.m(button, null);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*handleUpload*/ ctx[20], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type !== (current_block_type = select_block_type_5(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(button, null);
    				}
    			}

    			if (dirty[0] & /*uploading*/ 32 && button_disabled_value !== (button_disabled_value = /*uploading*/ ctx[5] || !/*canUpload*/ ctx[22]())) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if_block.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$2.name,
    		type: "else",
    		source: "(406:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (397:4) {#if currentStep < 3}
    function create_if_block_1$3(ctx) {
    	let button;
    	let t0;
    	let span;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			t0 = text("Next\r\n\t\t\t\t\t\t");
    			span = element("span");
    			span.textContent = "→";
    			add_location(span, file$3, 403, 6, 11405);
    			attr_dev(button, "class", "btn btn-success");
    			button.disabled = !/*canProceed*/ ctx[21]();
    			add_location(button, file$3, 397, 5, 11278);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t0);
    			append_dev(button, span);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*nextStep*/ ctx[17], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$3.name,
    		type: "if",
    		source: "(397:4) {#if currentStep < 3}",
    		ctx
    	});

    	return block;
    }

    // (415:6) {:else}
    function create_else_block_2(ctx) {
    	let span;
    	let t1;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "📤";
    			t1 = text("\r\n\t\t\t\t\t\t\tUpload File");
    			add_location(span, file$3, 415, 7, 11702);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			insert_dev(target, t1, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(t1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_2.name,
    		type: "else",
    		source: "(415:6) {:else}",
    		ctx
    	});

    	return block;
    }

    // (412:6) {#if uploading}
    function create_if_block_2$3(ctx) {
    	let span;
    	let t;

    	const block = {
    		c: function create() {
    			span = element("span");
    			t = text("\r\n\t\t\t\t\t\t\tUploading...");
    			attr_dev(span, "class", "loading-spinner svelte-1fdt9px");
    			add_location(span, file$3, 412, 7, 11620);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$3.name,
    		type: "if",
    		source: "(412:6) {#if uploading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div1;
    	let div0;
    	let h2;
    	let t1;
    	let p;
    	let t3;

    	function select_block_type(ctx, dirty) {
    		if (/*uploadSuccess*/ ctx[6]) return create_if_block$3;
    		return create_else_block$3;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "📤 Upload Past Questions";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Share your knowledge and help fellow students succeed";
    			t3 = space();
    			if_block.c();
    			attr_dev(h2, "class", "svelte-1fdt9px");
    			add_location(h2, file$3, 185, 3, 4476);
    			attr_dev(p, "class", "svelte-1fdt9px");
    			add_location(p, file$3, 186, 3, 4514);
    			attr_dev(div0, "class", "upload-header svelte-1fdt9px");
    			add_location(div0, file$3, 184, 2, 4444);
    			attr_dev(div1, "class", "card");
    			add_location(div1, file$3, 183, 1, 4422);
    			attr_dev(div2, "class", "upload-container svelte-1fdt9px");
    			add_location(div2, file$3, 182, 0, 4389);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div1);
    			append_dev(div1, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div1, t3);
    			if_block.m(div1, null);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function formatFileSize$1(bytes) {
    	if (bytes === 0) return '0 Bytes';
    	const k = 1024;
    	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    	const i = Math.floor(Math.log(bytes) / Math.log(k));
    	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getFileIcon$1(type) {
    	if (type.includes('pdf')) return '📄';
    	if (type.includes('word') || type.includes('document')) return '📝';
    	if (type.includes('image')) return '🖼️';
    	return '📁';
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('UploadComponent', slots, []);
    	const dispatch = createEventDispatcher();
    	let { uploadedFiles = [] } = $$props;
    	let { onAddCoins = null } = $$props;
    	let { onAddUploadedFile = null } = $$props;
    	let { onAddAvailableFile = null } = $$props;
    	let selectedFile = null;
    	let subject = '';
    	let year = '';
    	let examType = '';
    	let description = '';
    	let uploading = false;
    	let uploadSuccess = false;
    	let currentStep = 1;
    	let dragOver = false;

    	const examTypes = [
    		{
    			value: 'Midterm',
    			label: 'Midterm Exam',
    			icon: '📝'
    		},
    		{
    			value: 'Final',
    			label: 'Final Exam',
    			icon: '🎓'
    		},
    		{ value: 'Quiz', label: 'Quiz', icon: '❓' },
    		{
    			value: 'Assignment',
    			label: 'Assignment',
    			icon: '📋'
    		},
    		{
    			value: 'Other',
    			label: 'Other',
    			icon: '📄'
    		}
    	];

    	const subjects = [
    		'Mathematics',
    		'Physics',
    		'Chemistry',
    		'Biology',
    		'Computer Science',
    		'Economics',
    		'Business',
    		'Engineering',
    		'Medicine',
    		'Law',
    		'Other'
    	];

    	const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

    	const steps = [
    		{
    			number: 1,
    			title: 'Select File',
    			description: 'Choose your past question file'
    		},
    		{
    			number: 2,
    			title: 'Add Details',
    			description: 'Provide subject and exam information'
    		},
    		{
    			number: 3,
    			title: 'Review & Upload',
    			description: 'Confirm and upload your file'
    		}
    	];

    	function handleFileSelect(event) {
    		$$invalidate(0, selectedFile = event.target.files[0]);

    		if (selectedFile) {
    			nextStep();
    		}
    	}

    	function handleDragOver(event) {
    		event.preventDefault();
    		$$invalidate(8, dragOver = true);
    	}

    	function handleDragLeave(event) {
    		event.preventDefault();
    		$$invalidate(8, dragOver = false);
    	}

    	function handleDrop(event) {
    		event.preventDefault();
    		$$invalidate(8, dragOver = false);
    		const files = event.dataTransfer.files;

    		if (files.length > 0) {
    			$$invalidate(0, selectedFile = files[0]);
    			nextStep();
    		}
    	}

    	function nextStep() {
    		if (currentStep < 3) {
    			$$invalidate(7, currentStep++, currentStep);
    		}
    	}

    	function prevStep() {
    		if (currentStep > 1) {
    			$$invalidate(7, currentStep--, currentStep);
    		}
    	}

    	function goToStep(step) {
    		if (step <= currentStep || step === 2 && selectedFile || step === 3 && selectedFile && subject && year && examType) {
    			$$invalidate(7, currentStep = step);
    		}
    	}

    	function handleUpload() {
    		if (!selectedFile || !subject || !year || !examType) {
    			alert('Please fill in all required fields');
    			return;
    		}

    		$$invalidate(5, uploading = true);

    		// Simulate upload process
    		setTimeout(
    			() => {
    				const fileData = {
    					id: Date.now(),
    					name: selectedFile.name,
    					subject,
    					year,
    					examType,
    					description,
    					price: 0, // All files are free
    					uploadDate: new Date().toISOString(),
    					size: selectedFile.size,
    					type: selectedFile.type,
    					downloads: 0,
    					rating: 0
    				};

    				// Add to uploaded files (user's uploads)
    				if (onAddUploadedFile) {
    					onAddUploadedFile(fileData);
    				} else {
    					dispatch('addUploadedFile', fileData);
    				}

    				// Add to available files (for others to browse)
    				if (onAddAvailableFile) {
    					onAddAvailableFile(fileData);
    				} else {
    					dispatch('addAvailableFile', fileData);
    				}

    				// No payment system - files are free
    				$$invalidate(5, uploading = false);

    				$$invalidate(6, uploadSuccess = true);

    				// Reset form
    				resetForm();

    				// Hide success message after 3 seconds
    				setTimeout(
    					() => {
    						$$invalidate(6, uploadSuccess = false);
    					},
    					3000
    				);
    			},
    			1500
    		);
    	}

    	function resetForm() {
    		$$invalidate(0, selectedFile = null);
    		$$invalidate(1, subject = '');
    		$$invalidate(2, year = '');
    		$$invalidate(3, examType = '');
    		$$invalidate(4, description = '');
    		price = 5;
    		$$invalidate(7, currentStep = 1);

    		// Reset file input
    		const fileInput = document.getElementById('fileInput');

    		if (fileInput) fileInput.value = '';
    	}

    	function canProceed() {
    		switch (currentStep) {
    			case 1:
    				return selectedFile;
    			case 2:
    				return subject && year && examType;
    			default:
    				return true;
    		}
    	}

    	function canUpload() {
    		return selectedFile && subject && year && examType;
    	}

    	const writable_props = ['uploadedFiles', 'onAddCoins', 'onAddUploadedFile', 'onAddAvailableFile'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<UploadComponent> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];
    	const click_handler = () => $$invalidate(6, uploadSuccess = false);
    	const click_handler_1 = step => goToStep(step.number);
    	const click_handler_2 = () => document.getElementById('fileInput').click();
    	const click_handler_3 = () => document.getElementById('fileInput').click();

    	function select0_change_handler() {
    		subject = select_value(this);
    		$$invalidate(1, subject);
    		$$invalidate(10, subjects);
    	}

    	function select1_change_handler() {
    		year = select_value(this);
    		$$invalidate(2, year);
    		$$invalidate(11, years);
    	}

    	function input_change_handler() {
    		examType = this.__value;
    		$$invalidate(3, examType);
    	}

    	function textarea_input_handler() {
    		description = this.value;
    		$$invalidate(4, description);
    	}

    	$$self.$$set = $$props => {
    		if ('uploadedFiles' in $$props) $$invalidate(23, uploadedFiles = $$props.uploadedFiles);
    		if ('onAddCoins' in $$props) $$invalidate(24, onAddCoins = $$props.onAddCoins);
    		if ('onAddUploadedFile' in $$props) $$invalidate(25, onAddUploadedFile = $$props.onAddUploadedFile);
    		if ('onAddAvailableFile' in $$props) $$invalidate(26, onAddAvailableFile = $$props.onAddAvailableFile);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		uploadedFiles,
    		onAddCoins,
    		onAddUploadedFile,
    		onAddAvailableFile,
    		selectedFile,
    		subject,
    		year,
    		examType,
    		description,
    		uploading,
    		uploadSuccess,
    		currentStep,
    		dragOver,
    		examTypes,
    		subjects,
    		years,
    		steps,
    		handleFileSelect,
    		handleDragOver,
    		handleDragLeave,
    		handleDrop,
    		nextStep,
    		prevStep,
    		goToStep,
    		handleUpload,
    		resetForm,
    		formatFileSize: formatFileSize$1,
    		getFileIcon: getFileIcon$1,
    		canProceed,
    		canUpload
    	});

    	$$self.$inject_state = $$props => {
    		if ('uploadedFiles' in $$props) $$invalidate(23, uploadedFiles = $$props.uploadedFiles);
    		if ('onAddCoins' in $$props) $$invalidate(24, onAddCoins = $$props.onAddCoins);
    		if ('onAddUploadedFile' in $$props) $$invalidate(25, onAddUploadedFile = $$props.onAddUploadedFile);
    		if ('onAddAvailableFile' in $$props) $$invalidate(26, onAddAvailableFile = $$props.onAddAvailableFile);
    		if ('selectedFile' in $$props) $$invalidate(0, selectedFile = $$props.selectedFile);
    		if ('subject' in $$props) $$invalidate(1, subject = $$props.subject);
    		if ('year' in $$props) $$invalidate(2, year = $$props.year);
    		if ('examType' in $$props) $$invalidate(3, examType = $$props.examType);
    		if ('description' in $$props) $$invalidate(4, description = $$props.description);
    		if ('uploading' in $$props) $$invalidate(5, uploading = $$props.uploading);
    		if ('uploadSuccess' in $$props) $$invalidate(6, uploadSuccess = $$props.uploadSuccess);
    		if ('currentStep' in $$props) $$invalidate(7, currentStep = $$props.currentStep);
    		if ('dragOver' in $$props) $$invalidate(8, dragOver = $$props.dragOver);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedFile,
    		subject,
    		year,
    		examType,
    		description,
    		uploading,
    		uploadSuccess,
    		currentStep,
    		dragOver,
    		examTypes,
    		subjects,
    		years,
    		steps,
    		handleFileSelect,
    		handleDragOver,
    		handleDragLeave,
    		handleDrop,
    		nextStep,
    		prevStep,
    		goToStep,
    		handleUpload,
    		canProceed,
    		canUpload,
    		uploadedFiles,
    		onAddCoins,
    		onAddUploadedFile,
    		onAddAvailableFile,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		select0_change_handler,
    		select1_change_handler,
    		input_change_handler,
    		$$binding_groups,
    		textarea_input_handler
    	];
    }

    class UploadComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$3,
    			create_fragment$3,
    			safe_not_equal,
    			{
    				uploadedFiles: 23,
    				onAddCoins: 24,
    				onAddUploadedFile: 25,
    				onAddAvailableFile: 26
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "UploadComponent",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get uploadedFiles() {
    		throw new Error("<UploadComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set uploadedFiles(value) {
    		throw new Error("<UploadComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onAddCoins() {
    		throw new Error("<UploadComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onAddCoins(value) {
    		throw new Error("<UploadComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onAddUploadedFile() {
    		throw new Error("<UploadComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onAddUploadedFile(value) {
    		throw new Error("<UploadComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onAddAvailableFile() {
    		throw new Error("<UploadComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onAddAvailableFile(value) {
    		throw new Error("<UploadComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\BrowseComponent.svelte generated by Svelte v3.59.2 */
    const file$2 = "src\\components\\BrowseComponent.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[31] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[34] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[37] = list[i];
    	return child_ctx;
    }

    // (154:6) {#each subjects as subject}
    function create_each_block_3(ctx) {
    	let option;
    	let t_value = /*subject*/ ctx[37] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*subject*/ ctx[37];
    			option.value = option.__value;
    			add_location(option, file$2, 154, 7, 4494);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*subjects*/ 4096 && t_value !== (t_value = /*subject*/ ctx[37] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*subjects*/ 4096 && option_value_value !== (option_value_value = /*subject*/ ctx[37])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(154:6) {#each subjects as subject}",
    		ctx
    	});

    	return block;
    }

    // (164:6) {#each years as year}
    function create_each_block_2(ctx) {
    	let option;
    	let t_value = /*year*/ ctx[34] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*year*/ ctx[34];
    			option.value = option.__value;
    			add_location(option, file$2, 164, 7, 4801);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*years*/ 2048 && t_value !== (t_value = /*year*/ ctx[34] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*years*/ 2048 && option_value_value !== (option_value_value = /*year*/ ctx[34])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(164:6) {#each years as year}",
    		ctx
    	});

    	return block;
    }

    // (174:6) {#each examTypes as type}
    function create_each_block_1$1(ctx) {
    	let option;
    	let t_value = /*type*/ ctx[31] + "";
    	let t;
    	let option_value_value;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = option_value_value = /*type*/ ctx[31];
    			option.value = option.__value;
    			add_location(option, file$2, 174, 7, 5114);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*examTypes*/ 1024 && t_value !== (t_value = /*type*/ ctx[31] + "")) set_data_dev(t, t_value);

    			if (dirty[0] & /*examTypes*/ 1024 && option_value_value !== (option_value_value = /*type*/ ctx[31])) {
    				prop_dev(option, "__value", option_value_value);
    				option.value = option.__value;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(174:6) {#each examTypes as type}",
    		ctx
    	});

    	return block;
    }

    // (216:3) {:else}
    function create_else_block$2(ctx) {
    	let div;
    	let each_value = /*filteredFiles*/ ctx[9];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(div, "class", "files-grid svelte-n344dg");
    			add_location(div, file$2, 216, 4, 6366);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*openDownloadModal, filteredFiles*/ 8704) {
    				each_value = /*filteredFiles*/ ctx[9];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(216:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (210:3) {#if filteredFiles.length === 0}
    function create_if_block_3$2(ctx) {
    	let div1;
    	let div0;
    	let t1;
    	let h4;
    	let t3;
    	let p;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			div0.textContent = "🔍";
    			t1 = space();
    			h4 = element("h4");
    			h4.textContent = "No files found";
    			t3 = space();
    			p = element("p");
    			p.textContent = "Try adjusting your search criteria or filters to find what you're looking for.";
    			attr_dev(div0, "class", "no-results-icon svelte-n344dg");
    			add_location(div0, file$2, 211, 5, 6177);
    			attr_dev(h4, "class", "svelte-n344dg");
    			add_location(h4, file$2, 212, 5, 6221);
    			add_location(p, file$2, 213, 5, 6251);
    			attr_dev(div1, "class", "no-results svelte-n344dg");
    			add_location(div1, file$2, 210, 4, 6146);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div1, t1);
    			append_dev(div1, h4);
    			append_dev(div1, t3);
    			append_dev(div1, p);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$2.name,
    		type: "if",
    		source: "(210:3) {#if filteredFiles.length === 0}",
    		ctx
    	});

    	return block;
    }

    // (226:10) {#if file.price === 0 || file.isFree}
    function create_if_block_6(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "FREE";
    			attr_dev(span, "class", "free-badge svelte-n344dg");
    			add_location(span, file$2, 226, 11, 6783);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_6.name,
    		type: "if",
    		source: "(226:10) {#if file.price === 0 || file.isFree}",
    		ctx
    	});

    	return block;
    }

    // (234:9) {:else}
    function create_else_block_1$1(ctx) {
    	let span0;
    	let t0_value = /*file*/ ctx[28].price + "";
    	let t0;
    	let t1;
    	let span1;

    	const block = {
    		c: function create() {
    			span0 = element("span");
    			t0 = text(t0_value);
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "coins";
    			attr_dev(span0, "class", "price-amount svelte-n344dg");
    			add_location(span0, file$2, 234, 10, 7036);
    			attr_dev(span1, "class", "price-label svelte-n344dg");
    			add_location(span1, file$2, 235, 10, 7094);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);
    			append_dev(span0, t0);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, span1, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredFiles*/ 512 && t0_value !== (t0_value = /*file*/ ctx[28].price + "")) set_data_dev(t0, t0_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(span1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1$1.name,
    		type: "else",
    		source: "(234:9) {:else}",
    		ctx
    	});

    	return block;
    }

    // (232:9) {#if file.price === 0 || file.isFree}
    function create_if_block_5(ctx) {
    	let span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "FREE";
    			attr_dev(span, "class", "price-amount free svelte-n344dg");
    			add_location(span, file$2, 232, 10, 6963);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(232:9) {#if file.price === 0 || file.isFree}",
    		ctx
    	});

    	return block;
    }

    // (258:9) {#if file.rating}
    function create_if_block_4$1(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;
    	let t2_value = /*file*/ ctx[28].rating + "";
    	let t2;
    	let t3;
    	let t4_value = getRatingStars(/*file*/ ctx[28].rating) + "";
    	let t4;
    	let t5;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "⭐";
    			t1 = space();
    			span1 = element("span");
    			t2 = text(t2_value);
    			t3 = text(" (");
    			t4 = text(t4_value);
    			t5 = text(")");
    			attr_dev(span0, "class", "meta-icon svelte-n344dg");
    			add_location(span0, file$2, 259, 10, 7940);
    			attr_dev(span1, "class", "meta-text");
    			add_location(span1, file$2, 260, 10, 7984);
    			attr_dev(div, "class", "meta-item svelte-n344dg");
    			add_location(div, file$2, 258, 9, 7905);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			append_dev(span1, t3);
    			append_dev(span1, t4);
    			append_dev(span1, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*filteredFiles*/ 512 && t2_value !== (t2_value = /*file*/ ctx[28].rating + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*filteredFiles*/ 512 && t4_value !== (t4_value = getRatingStars(/*file*/ ctx[28].rating) + "")) set_data_dev(t4, t4_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(258:9) {#if file.rating}",
    		ctx
    	});

    	return block;
    }

    // (218:5) {#each filteredFiles as file}
    function create_each_block$1(ctx) {
    	let div13;
    	let div4;
    	let div0;
    	let t0_value = getFileIcon(/*file*/ ctx[28].type) + "";
    	let t0;
    	let t1;
    	let div2;
    	let h4;
    	let t2_value = /*file*/ ctx[28].subject + "";
    	let t2;
    	let t3;
    	let div1;
    	let span0;
    	let t4_value = /*file*/ ctx[28].examType + "";
    	let t4;
    	let t5;
    	let t6;
    	let div3;
    	let t7;
    	let div11;
    	let div5;
    	let t8_value = /*file*/ ctx[28].name + "";
    	let t8;
    	let t9;
    	let div6;
    	let t10_value = /*file*/ ctx[28].description + "";
    	let t10;
    	let t11;
    	let div10;
    	let div7;
    	let span1;
    	let t13;
    	let span2;
    	let t14_value = /*file*/ ctx[28].year + "";
    	let t14;
    	let t15;
    	let div8;
    	let span3;
    	let t17;
    	let span4;
    	let t18_value = formatFileSize(/*file*/ ctx[28].size) + "";
    	let t18;
    	let t19;
    	let div9;
    	let span5;
    	let t21;
    	let span6;
    	let t22_value = (/*file*/ ctx[28].downloads || 0) + "";
    	let t22;
    	let t23;
    	let t24;
    	let t25;
    	let div12;
    	let button;
    	let span7;
    	let t27;
    	let span8;
    	let t29;
    	let mounted;
    	let dispose;
    	let if_block0 = (/*file*/ ctx[28].price === 0 || /*file*/ ctx[28].isFree) && create_if_block_6(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*file*/ ctx[28].price === 0 || /*file*/ ctx[28].isFree) return create_if_block_5;
    		return create_else_block_1$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block1 = current_block_type(ctx);
    	let if_block2 = /*file*/ ctx[28].rating && create_if_block_4$1(ctx);

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[26](/*file*/ ctx[28]);
    	}

    	const block = {
    		c: function create() {
    			div13 = element("div");
    			div4 = element("div");
    			div0 = element("div");
    			t0 = text(t0_value);
    			t1 = space();
    			div2 = element("div");
    			h4 = element("h4");
    			t2 = text(t2_value);
    			t3 = space();
    			div1 = element("div");
    			span0 = element("span");
    			t4 = text(t4_value);
    			t5 = space();
    			if (if_block0) if_block0.c();
    			t6 = space();
    			div3 = element("div");
    			if_block1.c();
    			t7 = space();
    			div11 = element("div");
    			div5 = element("div");
    			t8 = text(t8_value);
    			t9 = space();
    			div6 = element("div");
    			t10 = text(t10_value);
    			t11 = space();
    			div10 = element("div");
    			div7 = element("div");
    			span1 = element("span");
    			span1.textContent = "📅";
    			t13 = space();
    			span2 = element("span");
    			t14 = text(t14_value);
    			t15 = space();
    			div8 = element("div");
    			span3 = element("span");
    			span3.textContent = "📊";
    			t17 = space();
    			span4 = element("span");
    			t18 = text(t18_value);
    			t19 = space();
    			div9 = element("div");
    			span5 = element("span");
    			span5.textContent = "📥";
    			t21 = space();
    			span6 = element("span");
    			t22 = text(t22_value);
    			t23 = text(" downloads");
    			t24 = space();
    			if (if_block2) if_block2.c();
    			t25 = space();
    			div12 = element("div");
    			button = element("button");
    			span7 = element("span");
    			span7.textContent = "👁️";
    			t27 = space();
    			span8 = element("span");
    			span8.textContent = "View & Download";
    			t29 = space();
    			attr_dev(div0, "class", "file-icon svelte-n344dg");
    			add_location(div0, file$2, 220, 8, 6501);
    			attr_dev(h4, "class", "svelte-n344dg");
    			add_location(h4, file$2, 222, 9, 6599);
    			attr_dev(span0, "class", "file-type svelte-n344dg");
    			add_location(span0, file$2, 224, 10, 6675);
    			attr_dev(div1, "class", "file-type-badges svelte-n344dg");
    			add_location(div1, file$2, 223, 9, 6633);
    			attr_dev(div2, "class", "file-title svelte-n344dg");
    			add_location(div2, file$2, 221, 8, 6564);
    			attr_dev(div3, "class", "file-price svelte-n344dg");
    			add_location(div3, file$2, 230, 8, 6879);
    			attr_dev(div4, "class", "file-header svelte-n344dg");
    			add_location(div4, file$2, 219, 7, 6466);
    			attr_dev(div5, "class", "file-name svelte-n344dg");
    			add_location(div5, file$2, 241, 8, 7233);
    			attr_dev(div6, "class", "file-description svelte-n344dg");
    			add_location(div6, file$2, 242, 8, 7283);
    			attr_dev(span1, "class", "meta-icon svelte-n344dg");
    			add_location(span1, file$2, 246, 10, 7426);
    			attr_dev(span2, "class", "meta-text");
    			add_location(span2, file$2, 247, 10, 7471);
    			attr_dev(div7, "class", "meta-item svelte-n344dg");
    			add_location(div7, file$2, 245, 9, 7391);
    			attr_dev(span3, "class", "meta-icon svelte-n344dg");
    			add_location(span3, file$2, 250, 10, 7576);
    			attr_dev(span4, "class", "meta-text");
    			add_location(span4, file$2, 251, 10, 7621);
    			attr_dev(div8, "class", "meta-item svelte-n344dg");
    			add_location(div8, file$2, 249, 9, 7541);
    			attr_dev(span5, "class", "meta-icon svelte-n344dg");
    			add_location(span5, file$2, 254, 10, 7742);
    			attr_dev(span6, "class", "meta-text");
    			add_location(span6, file$2, 255, 10, 7787);
    			attr_dev(div9, "class", "meta-item svelte-n344dg");
    			add_location(div9, file$2, 253, 9, 7707);
    			attr_dev(div10, "class", "file-meta svelte-n344dg");
    			add_location(div10, file$2, 244, 8, 7357);
    			attr_dev(div11, "class", "file-content svelte-n344dg");
    			add_location(div11, file$2, 240, 7, 7197);
    			attr_dev(span7, "class", "btn-icon svelte-n344dg");
    			add_location(span7, file$2, 271, 9, 8293);
    			attr_dev(span8, "class", "btn-text");
    			add_location(span8, file$2, 272, 9, 8337);
    			attr_dev(button, "class", "download-btn available svelte-n344dg");
    			add_location(button, file$2, 267, 8, 8171);
    			attr_dev(div12, "class", "file-actions svelte-n344dg");
    			add_location(div12, file$2, 266, 7, 8135);
    			attr_dev(div13, "class", "file-card svelte-n344dg");
    			add_location(div13, file$2, 218, 6, 6434);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div13, anchor);
    			append_dev(div13, div4);
    			append_dev(div4, div0);
    			append_dev(div0, t0);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div2, h4);
    			append_dev(h4, t2);
    			append_dev(div2, t3);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(span0, t4);
    			append_dev(div1, t5);
    			if (if_block0) if_block0.m(div1, null);
    			append_dev(div4, t6);
    			append_dev(div4, div3);
    			if_block1.m(div3, null);
    			append_dev(div13, t7);
    			append_dev(div13, div11);
    			append_dev(div11, div5);
    			append_dev(div5, t8);
    			append_dev(div11, t9);
    			append_dev(div11, div6);
    			append_dev(div6, t10);
    			append_dev(div11, t11);
    			append_dev(div11, div10);
    			append_dev(div10, div7);
    			append_dev(div7, span1);
    			append_dev(div7, t13);
    			append_dev(div7, span2);
    			append_dev(span2, t14);
    			append_dev(div10, t15);
    			append_dev(div10, div8);
    			append_dev(div8, span3);
    			append_dev(div8, t17);
    			append_dev(div8, span4);
    			append_dev(span4, t18);
    			append_dev(div10, t19);
    			append_dev(div10, div9);
    			append_dev(div9, span5);
    			append_dev(div9, t21);
    			append_dev(div9, span6);
    			append_dev(span6, t22);
    			append_dev(span6, t23);
    			append_dev(div10, t24);
    			if (if_block2) if_block2.m(div10, null);
    			append_dev(div13, t25);
    			append_dev(div13, div12);
    			append_dev(div12, button);
    			append_dev(button, span7);
    			append_dev(button, t27);
    			append_dev(button, span8);
    			append_dev(div13, t29);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler_1, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if (dirty[0] & /*filteredFiles*/ 512 && t0_value !== (t0_value = getFileIcon(/*file*/ ctx[28].type) + "")) set_data_dev(t0, t0_value);
    			if (dirty[0] & /*filteredFiles*/ 512 && t2_value !== (t2_value = /*file*/ ctx[28].subject + "")) set_data_dev(t2, t2_value);
    			if (dirty[0] & /*filteredFiles*/ 512 && t4_value !== (t4_value = /*file*/ ctx[28].examType + "")) set_data_dev(t4, t4_value);

    			if (/*file*/ ctx[28].price === 0 || /*file*/ ctx[28].isFree) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_6(ctx);
    					if_block0.c();
    					if_block0.m(div1, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
    				if_block1.p(ctx, dirty);
    			} else {
    				if_block1.d(1);
    				if_block1 = current_block_type(ctx);

    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(div3, null);
    				}
    			}

    			if (dirty[0] & /*filteredFiles*/ 512 && t8_value !== (t8_value = /*file*/ ctx[28].name + "")) set_data_dev(t8, t8_value);
    			if (dirty[0] & /*filteredFiles*/ 512 && t10_value !== (t10_value = /*file*/ ctx[28].description + "")) set_data_dev(t10, t10_value);
    			if (dirty[0] & /*filteredFiles*/ 512 && t14_value !== (t14_value = /*file*/ ctx[28].year + "")) set_data_dev(t14, t14_value);
    			if (dirty[0] & /*filteredFiles*/ 512 && t18_value !== (t18_value = formatFileSize(/*file*/ ctx[28].size) + "")) set_data_dev(t18, t18_value);
    			if (dirty[0] & /*filteredFiles*/ 512 && t22_value !== (t22_value = (/*file*/ ctx[28].downloads || 0) + "")) set_data_dev(t22, t22_value);

    			if (/*file*/ ctx[28].rating) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    				} else {
    					if_block2 = create_if_block_4$1(ctx);
    					if_block2.c();
    					if_block2.m(div10, null);
    				}
    			} else if (if_block2) {
    				if_block2.d(1);
    				if_block2 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div13);
    			if (if_block0) if_block0.d();
    			if_block1.d();
    			if (if_block2) if_block2.d();
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(218:5) {#each filteredFiles as file}",
    		ctx
    	});

    	return block;
    }

    // (284:1) {#if showDownloadModal && selectedFile}
    function create_if_block$2(ctx) {
    	let div19;
    	let div18;
    	let div0;
    	let h3;
    	let t1;
    	let button;
    	let t3;
    	let div16;
    	let div15;
    	let div4;
    	let div1;
    	let t4_value = getFileIcon(/*selectedFile*/ ctx[6].type) + "";
    	let t4;
    	let t5;
    	let div3;
    	let h4;
    	let t6_value = /*selectedFile*/ ctx[6].name + "";
    	let t6;
    	let t7;
    	let div2;
    	let span0;
    	let t8_value = /*selectedFile*/ ctx[6].subject + "";
    	let t8;
    	let t9;
    	let span1;
    	let t10_value = /*selectedFile*/ ctx[6].examType + "";
    	let t10;
    	let t11;
    	let span2;
    	let t12_value = /*selectedFile*/ ctx[6].year + "";
    	let t12;
    	let t13;
    	let div5;
    	let h50;
    	let t15;
    	let p0;
    	let t16_value = /*selectedFile*/ ctx[6].description + "";
    	let t16;
    	let t17;
    	let div10;
    	let div6;
    	let span3;
    	let t19;
    	let span4;
    	let t21;
    	let span5;
    	let t22_value = formatFileSize(/*selectedFile*/ ctx[6].size) + "";
    	let t22;
    	let t23;
    	let div7;
    	let span6;
    	let t25;
    	let span7;
    	let t27;
    	let span8;
    	let t28_value = (/*selectedFile*/ ctx[6].downloads || 0) + "";
    	let t28;
    	let t29;
    	let div8;
    	let span9;
    	let t31;
    	let span10;
    	let t33;
    	let span11;
    	let t34_value = (/*selectedFile*/ ctx[6].rating || 'N/A') + "";
    	let t34;
    	let t35;
    	let div9;
    	let span12;
    	let t37;
    	let span13;
    	let t39;
    	let span14;
    	let t40_value = new Date(/*selectedFile*/ ctx[6].uploadDate).toLocaleDateString() + "";
    	let t40;
    	let t41;
    	let div14;
    	let h51;
    	let t43;
    	let div13;
    	let div12;
    	let div11;
    	let t44_value = getFileIcon(/*selectedFile*/ ctx[6].type) + "";
    	let t44;
    	let t45;
    	let p1;
    	let t47;
    	let p2;
    	let t49;
    	let t50;
    	let div17;
    	let mounted;
    	let dispose;
    	let if_block0 = /*downloading*/ ctx[7] && create_if_block_2$2(ctx);
    	let if_block1 = !/*downloading*/ ctx[7] && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			div19 = element("div");
    			div18 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "📄 Past Question Preview";
    			t1 = space();
    			button = element("button");
    			button.textContent = "×";
    			t3 = space();
    			div16 = element("div");
    			div15 = element("div");
    			div4 = element("div");
    			div1 = element("div");
    			t4 = text(t4_value);
    			t5 = space();
    			div3 = element("div");
    			h4 = element("h4");
    			t6 = text(t6_value);
    			t7 = space();
    			div2 = element("div");
    			span0 = element("span");
    			t8 = text(t8_value);
    			t9 = space();
    			span1 = element("span");
    			t10 = text(t10_value);
    			t11 = space();
    			span2 = element("span");
    			t12 = text(t12_value);
    			t13 = space();
    			div5 = element("div");
    			h50 = element("h5");
    			h50.textContent = "Description";
    			t15 = space();
    			p0 = element("p");
    			t16 = text(t16_value);
    			t17 = space();
    			div10 = element("div");
    			div6 = element("div");
    			span3 = element("span");
    			span3.textContent = "📊";
    			t19 = space();
    			span4 = element("span");
    			span4.textContent = "File Size";
    			t21 = space();
    			span5 = element("span");
    			t22 = text(t22_value);
    			t23 = space();
    			div7 = element("div");
    			span6 = element("span");
    			span6.textContent = "📥";
    			t25 = space();
    			span7 = element("span");
    			span7.textContent = "Downloads";
    			t27 = space();
    			span8 = element("span");
    			t28 = text(t28_value);
    			t29 = space();
    			div8 = element("div");
    			span9 = element("span");
    			span9.textContent = "⭐";
    			t31 = space();
    			span10 = element("span");
    			span10.textContent = "Rating";
    			t33 = space();
    			span11 = element("span");
    			t34 = text(t34_value);
    			t35 = space();
    			div9 = element("div");
    			span12 = element("span");
    			span12.textContent = "📅";
    			t37 = space();
    			span13 = element("span");
    			span13.textContent = "Uploaded";
    			t39 = space();
    			span14 = element("span");
    			t40 = text(t40_value);
    			t41 = space();
    			div14 = element("div");
    			h51 = element("h5");
    			h51.textContent = "Preview Content";
    			t43 = space();
    			div13 = element("div");
    			div12 = element("div");
    			div11 = element("div");
    			t44 = text(t44_value);
    			t45 = space();
    			p1 = element("p");
    			p1.textContent = "This is a preview of the past question content.";
    			t47 = space();
    			p2 = element("p");
    			p2.textContent = "Click \"Download\" to get the full file.";
    			t49 = space();
    			if (if_block0) if_block0.c();
    			t50 = space();
    			div17 = element("div");
    			if (if_block1) if_block1.c();
    			attr_dev(h3, "class", "svelte-n344dg");
    			add_location(h3, file$2, 287, 5, 8736);
    			attr_dev(button, "class", "modal-close svelte-n344dg");
    			add_location(button, file$2, 288, 5, 8776);
    			attr_dev(div0, "class", "modal-header svelte-n344dg");
    			add_location(div0, file$2, 286, 4, 8703);
    			attr_dev(div1, "class", "preview-icon svelte-n344dg");
    			add_location(div1, file$2, 294, 7, 8978);
    			attr_dev(h4, "class", "svelte-n344dg");
    			add_location(h4, file$2, 296, 8, 9087);
    			attr_dev(span0, "class", "meta-badge svelte-n344dg");
    			add_location(span0, file$2, 298, 9, 9162);
    			attr_dev(span1, "class", "meta-badge svelte-n344dg");
    			add_location(span1, file$2, 299, 9, 9227);
    			attr_dev(span2, "class", "meta-badge svelte-n344dg");
    			add_location(span2, file$2, 300, 9, 9293);
    			attr_dev(div2, "class", "preview-meta svelte-n344dg");
    			add_location(div2, file$2, 297, 8, 9125);
    			attr_dev(div3, "class", "preview-info svelte-n344dg");
    			add_location(div3, file$2, 295, 7, 9051);
    			attr_dev(div4, "class", "preview-header svelte-n344dg");
    			add_location(div4, file$2, 293, 6, 8941);
    			attr_dev(h50, "class", "svelte-n344dg");
    			add_location(h50, file$2, 306, 7, 9447);
    			attr_dev(p0, "class", "svelte-n344dg");
    			add_location(p0, file$2, 307, 7, 9476);
    			attr_dev(div5, "class", "preview-description svelte-n344dg");
    			add_location(div5, file$2, 305, 6, 9405);
    			attr_dev(span3, "class", "stat-icon svelte-n344dg");
    			add_location(span3, file$2, 312, 8, 9602);
    			attr_dev(span4, "class", "stat-label svelte-n344dg");
    			add_location(span4, file$2, 313, 8, 9645);
    			attr_dev(span5, "class", "stat-value svelte-n344dg");
    			add_location(span5, file$2, 314, 8, 9696);
    			attr_dev(div6, "class", "stat-item svelte-n344dg");
    			add_location(div6, file$2, 311, 7, 9569);
    			attr_dev(span6, "class", "stat-icon svelte-n344dg");
    			add_location(span6, file$2, 317, 8, 9820);
    			attr_dev(span7, "class", "stat-label svelte-n344dg");
    			add_location(span7, file$2, 318, 8, 9863);
    			attr_dev(span8, "class", "stat-value svelte-n344dg");
    			add_location(span8, file$2, 319, 8, 9914);
    			attr_dev(div7, "class", "stat-item svelte-n344dg");
    			add_location(div7, file$2, 316, 7, 9787);
    			attr_dev(span9, "class", "stat-icon svelte-n344dg");
    			add_location(span9, file$2, 322, 8, 10032);
    			attr_dev(span10, "class", "stat-label svelte-n344dg");
    			add_location(span10, file$2, 323, 8, 10074);
    			attr_dev(span11, "class", "stat-value svelte-n344dg");
    			add_location(span11, file$2, 324, 8, 10122);
    			attr_dev(div8, "class", "stat-item svelte-n344dg");
    			add_location(div8, file$2, 321, 7, 9999);
    			attr_dev(span12, "class", "stat-icon svelte-n344dg");
    			add_location(span12, file$2, 327, 8, 10241);
    			attr_dev(span13, "class", "stat-label svelte-n344dg");
    			add_location(span13, file$2, 328, 8, 10284);
    			attr_dev(span14, "class", "stat-value svelte-n344dg");
    			add_location(span14, file$2, 329, 8, 10334);
    			attr_dev(div9, "class", "stat-item svelte-n344dg");
    			add_location(div9, file$2, 326, 7, 10208);
    			attr_dev(div10, "class", "preview-stats svelte-n344dg");
    			add_location(div10, file$2, 310, 6, 9533);
    			attr_dev(h51, "class", "svelte-n344dg");
    			add_location(h51, file$2, 334, 7, 10499);
    			attr_dev(div11, "class", "preview-icon-large svelte-n344dg");
    			add_location(div11, file$2, 337, 9, 10615);
    			attr_dev(p1, "class", "svelte-n344dg");
    			add_location(p1, file$2, 338, 9, 10696);
    			attr_dev(p2, "class", "svelte-n344dg");
    			add_location(p2, file$2, 339, 9, 10761);
    			attr_dev(div12, "class", "preview-placeholder svelte-n344dg");
    			add_location(div12, file$2, 336, 8, 10571);
    			attr_dev(div13, "class", "content-preview svelte-n344dg");
    			add_location(div13, file$2, 335, 7, 10532);
    			attr_dev(div14, "class", "preview-content svelte-n344dg");
    			add_location(div14, file$2, 333, 6, 10461);
    			attr_dev(div15, "class", "file-preview-section svelte-n344dg");
    			add_location(div15, file$2, 292, 5, 8899);
    			attr_dev(div16, "class", "modal-body svelte-n344dg");
    			add_location(div16, file$2, 291, 4, 8868);
    			attr_dev(div17, "class", "modal-footer svelte-n344dg");
    			add_location(div17, file$2, 355, 4, 11195);
    			attr_dev(div18, "class", "modal-content preview-modal svelte-n344dg");
    			add_location(div18, file$2, 285, 3, 8631);
    			attr_dev(div19, "class", "modal-overlay svelte-n344dg");
    			add_location(div19, file$2, 284, 2, 8569);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div19, anchor);
    			append_dev(div19, div18);
    			append_dev(div18, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(div18, t3);
    			append_dev(div18, div16);
    			append_dev(div16, div15);
    			append_dev(div15, div4);
    			append_dev(div4, div1);
    			append_dev(div1, t4);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, h4);
    			append_dev(h4, t6);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, span0);
    			append_dev(span0, t8);
    			append_dev(div2, t9);
    			append_dev(div2, span1);
    			append_dev(span1, t10);
    			append_dev(div2, t11);
    			append_dev(div2, span2);
    			append_dev(span2, t12);
    			append_dev(div15, t13);
    			append_dev(div15, div5);
    			append_dev(div5, h50);
    			append_dev(div5, t15);
    			append_dev(div5, p0);
    			append_dev(p0, t16);
    			append_dev(div15, t17);
    			append_dev(div15, div10);
    			append_dev(div10, div6);
    			append_dev(div6, span3);
    			append_dev(div6, t19);
    			append_dev(div6, span4);
    			append_dev(div6, t21);
    			append_dev(div6, span5);
    			append_dev(span5, t22);
    			append_dev(div10, t23);
    			append_dev(div10, div7);
    			append_dev(div7, span6);
    			append_dev(div7, t25);
    			append_dev(div7, span7);
    			append_dev(div7, t27);
    			append_dev(div7, span8);
    			append_dev(span8, t28);
    			append_dev(div10, t29);
    			append_dev(div10, div8);
    			append_dev(div8, span9);
    			append_dev(div8, t31);
    			append_dev(div8, span10);
    			append_dev(div8, t33);
    			append_dev(div8, span11);
    			append_dev(span11, t34);
    			append_dev(div10, t35);
    			append_dev(div10, div9);
    			append_dev(div9, span12);
    			append_dev(div9, t37);
    			append_dev(div9, span13);
    			append_dev(div9, t39);
    			append_dev(div9, span14);
    			append_dev(span14, t40);
    			append_dev(div15, t41);
    			append_dev(div15, div14);
    			append_dev(div14, h51);
    			append_dev(div14, t43);
    			append_dev(div14, div13);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, t44);
    			append_dev(div12, t45);
    			append_dev(div12, p1);
    			append_dev(div12, t47);
    			append_dev(div12, p2);
    			append_dev(div16, t49);
    			if (if_block0) if_block0.m(div16, null);
    			append_dev(div18, t50);
    			append_dev(div18, div17);
    			if (if_block1) if_block1.m(div17, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button, "click", /*closeDownloadModal*/ ctx[15], false, false, false, false),
    					listen_dev(div18, "click", stop_propagation(/*click_handler*/ ctx[20]), false, false, true, false),
    					listen_dev(div19, "click", /*closeDownloadModal*/ ctx[15], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*selectedFile*/ 64 && t4_value !== (t4_value = getFileIcon(/*selectedFile*/ ctx[6].type) + "")) set_data_dev(t4, t4_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t6_value !== (t6_value = /*selectedFile*/ ctx[6].name + "")) set_data_dev(t6, t6_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t8_value !== (t8_value = /*selectedFile*/ ctx[6].subject + "")) set_data_dev(t8, t8_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t10_value !== (t10_value = /*selectedFile*/ ctx[6].examType + "")) set_data_dev(t10, t10_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t12_value !== (t12_value = /*selectedFile*/ ctx[6].year + "")) set_data_dev(t12, t12_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t16_value !== (t16_value = /*selectedFile*/ ctx[6].description + "")) set_data_dev(t16, t16_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t22_value !== (t22_value = formatFileSize(/*selectedFile*/ ctx[6].size) + "")) set_data_dev(t22, t22_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t28_value !== (t28_value = (/*selectedFile*/ ctx[6].downloads || 0) + "")) set_data_dev(t28, t28_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t34_value !== (t34_value = (/*selectedFile*/ ctx[6].rating || 'N/A') + "")) set_data_dev(t34, t34_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t40_value !== (t40_value = new Date(/*selectedFile*/ ctx[6].uploadDate).toLocaleDateString() + "")) set_data_dev(t40, t40_value);
    			if (dirty[0] & /*selectedFile*/ 64 && t44_value !== (t44_value = getFileIcon(/*selectedFile*/ ctx[6].type) + "")) set_data_dev(t44, t44_value);

    			if (/*downloading*/ ctx[7]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$2(ctx);
    					if_block0.c();
    					if_block0.m(div16, null);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!/*downloading*/ ctx[7]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_1$2(ctx);
    					if_block1.c();
    					if_block1.m(div17, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div19);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(284:1) {#if showDownloadModal && selectedFile}",
    		ctx
    	});

    	return block;
    }

    // (346:5) {#if downloading}
    function create_if_block_2$2(ctx) {
    	let div3;
    	let div1;
    	let div0;
    	let t0;
    	let div2;
    	let t1;
    	let t2_value = Math.round(/*downloadProgress*/ ctx[8]) + "";
    	let t2;
    	let t3;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div2 = element("div");
    			t1 = text("Downloading... ");
    			t2 = text(t2_value);
    			t3 = text("%");
    			attr_dev(div0, "class", "progress-fill svelte-n344dg");
    			set_style(div0, "width", /*downloadProgress*/ ctx[8] + "%");
    			add_location(div0, file$2, 348, 8, 10974);
    			attr_dev(div1, "class", "progress-bar svelte-n344dg");
    			add_location(div1, file$2, 347, 7, 10938);
    			attr_dev(div2, "class", "progress-text svelte-n344dg");
    			add_location(div2, file$2, 350, 7, 11066);
    			attr_dev(div3, "class", "download-progress svelte-n344dg");
    			add_location(div3, file$2, 346, 6, 10898);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div1);
    			append_dev(div1, div0);
    			append_dev(div3, t0);
    			append_dev(div3, div2);
    			append_dev(div2, t1);
    			append_dev(div2, t2);
    			append_dev(div2, t3);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*downloadProgress*/ 256) {
    				set_style(div0, "width", /*downloadProgress*/ ctx[8] + "%");
    			}

    			if (dirty[0] & /*downloadProgress*/ 256 && t2_value !== (t2_value = Math.round(/*downloadProgress*/ ctx[8]) + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$2.name,
    		type: "if",
    		source: "(346:5) {#if downloading}",
    		ctx
    	});

    	return block;
    }

    // (357:5) {#if !downloading}
    function create_if_block_1$2(ctx) {
    	let button0;
    	let span0;
    	let t1;
    	let t2;
    	let button1;
    	let span1;
    	let t4;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button0 = element("button");
    			span0 = element("span");
    			span0.textContent = "←";
    			t1 = text("\r\n\t\t\t\t\t\t\tBack to Browse");
    			t2 = space();
    			button1 = element("button");
    			span1 = element("span");
    			span1.textContent = "📥";
    			t4 = text("\r\n\t\t\t\t\t\t\tDownload File");
    			add_location(span0, file$2, 358, 7, 11327);
    			attr_dev(button0, "class", "btn btn-secondary svelte-n344dg");
    			add_location(button0, file$2, 357, 6, 11254);
    			add_location(span1, file$2, 362, 7, 11457);
    			attr_dev(button1, "class", "btn btn-success svelte-n344dg");
    			add_location(button1, file$2, 361, 6, 11389);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button0, anchor);
    			append_dev(button0, span0);
    			append_dev(button0, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, button1, anchor);
    			append_dev(button1, span1);
    			append_dev(button1, t4);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*closeDownloadModal*/ ctx[15], false, false, false, false),
    					listen_dev(button1, "click", /*confirmDownload*/ ctx[14], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(button1);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(357:5) {#if !downloading}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div14;
    	let div13;
    	let div0;
    	let h2;
    	let t1;
    	let p;
    	let t3;
    	let div9;
    	let div2;
    	let div1;
    	let span0;
    	let t5;
    	let input;
    	let t6;
    	let div7;
    	let div3;
    	let label0;
    	let t8;
    	let select0;
    	let option0;
    	let t10;
    	let div4;
    	let label1;
    	let t12;
    	let select1;
    	let option1;
    	let t14;
    	let div5;
    	let label2;
    	let t16;
    	let select2;
    	let option2;
    	let t18;
    	let div6;
    	let label3;
    	let t20;
    	let select3;
    	let option3;
    	let option4;
    	let option5;
    	let option6;
    	let option7;
    	let t26;
    	let div8;
    	let button;
    	let span1;
    	let t28;
    	let t29;
    	let div12;
    	let div11;
    	let h3;
    	let t31;
    	let div10;
    	let span2;
    	let t32_value = /*filteredFiles*/ ctx[9].length + "";
    	let t32;
    	let t33;
    	let span3;
    	let t35;
    	let t36;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*subjects*/ ctx[12];
    	validate_each_argument(each_value_3);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_2[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*years*/ ctx[11];
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*examTypes*/ ctx[10];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	function select_block_type(ctx, dirty) {
    		if (/*filteredFiles*/ ctx[9].length === 0) return create_if_block_3$2;
    		return create_else_block$2;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let if_block1 = /*showDownloadModal*/ ctx[5] && /*selectedFile*/ ctx[6] && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			div14 = element("div");
    			div13 = element("div");
    			div0 = element("div");
    			h2 = element("h2");
    			h2.textContent = "🔍 Browse Past Questions";
    			t1 = space();
    			p = element("p");
    			p.textContent = "Discover and download high-quality study materials from fellow students";
    			t3 = space();
    			div9 = element("div");
    			div2 = element("div");
    			div1 = element("div");
    			span0 = element("span");
    			span0.textContent = "🔍";
    			t5 = space();
    			input = element("input");
    			t6 = space();
    			div7 = element("div");
    			div3 = element("div");
    			label0 = element("label");
    			label0.textContent = "Subject";
    			t8 = space();
    			select0 = element("select");
    			option0 = element("option");
    			option0.textContent = "All Subjects";

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t10 = space();
    			div4 = element("div");
    			label1 = element("label");
    			label1.textContent = "Academic Year";
    			t12 = space();
    			select1 = element("select");
    			option1 = element("option");
    			option1.textContent = "All Years";

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t14 = space();
    			div5 = element("div");
    			label2 = element("label");
    			label2.textContent = "Exam Type";
    			t16 = space();
    			select2 = element("select");
    			option2 = element("option");
    			option2.textContent = "All Types";

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t18 = space();
    			div6 = element("div");
    			label3 = element("label");
    			label3.textContent = "Sort By";
    			t20 = space();
    			select3 = element("select");
    			option3 = element("option");
    			option3.textContent = "Newest First";
    			option4 = element("option");
    			option4.textContent = "Most Popular";
    			option5 = element("option");
    			option5.textContent = "Price: Low to High";
    			option6 = element("option");
    			option6.textContent = "Price: High to Low";
    			option7 = element("option");
    			option7.textContent = "Subject A-Z";
    			t26 = space();
    			div8 = element("div");
    			button = element("button");
    			span1 = element("span");
    			span1.textContent = "🔄";
    			t28 = text("\r\n\t\t\t\t\tClear Filters");
    			t29 = space();
    			div12 = element("div");
    			div11 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Available Files";
    			t31 = space();
    			div10 = element("div");
    			span2 = element("span");
    			t32 = text(t32_value);
    			t33 = space();
    			span3 = element("span");
    			span3.textContent = "files found";
    			t35 = space();
    			if_block0.c();
    			t36 = space();
    			if (if_block1) if_block1.c();
    			attr_dev(h2, "class", "svelte-n344dg");
    			add_location(h2, file$2, 130, 3, 3730);
    			attr_dev(p, "class", "svelte-n344dg");
    			add_location(p, file$2, 131, 3, 3768);
    			attr_dev(div0, "class", "section-header svelte-n344dg");
    			add_location(div0, file$2, 129, 2, 3697);
    			attr_dev(span0, "class", "search-icon svelte-n344dg");
    			add_location(span0, file$2, 138, 5, 4001);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "Search by subject, description, or filename...");
    			attr_dev(input, "class", "search-input svelte-n344dg");
    			add_location(input, file$2, 139, 5, 4043);
    			attr_dev(div1, "class", "search-input-wrapper svelte-n344dg");
    			add_location(div1, file$2, 137, 4, 3960);
    			attr_dev(div2, "class", "search-section svelte-n344dg");
    			add_location(div2, file$2, 136, 3, 3926);
    			attr_dev(label0, "for", "subjectFilter");
    			add_location(label0, file$2, 150, 5, 4299);
    			option0.__value = "";
    			option0.value = option0.__value;
    			add_location(option0, file$2, 152, 6, 4412);
    			attr_dev(select0, "id", "subjectFilter");
    			if (/*selectedSubject*/ ctx[1] === void 0) add_render_callback(() => /*select0_change_handler*/ ctx[22].call(select0));
    			add_location(select0, file$2, 151, 5, 4348);
    			attr_dev(div3, "class", "form-group");
    			add_location(div3, file$2, 149, 4, 4268);
    			attr_dev(label1, "for", "yearFilter");
    			add_location(label1, file$2, 160, 5, 4618);
    			option1.__value = "";
    			option1.value = option1.__value;
    			add_location(option1, file$2, 162, 6, 4728);
    			attr_dev(select1, "id", "yearFilter");
    			if (/*selectedYear*/ ctx[2] === void 0) add_render_callback(() => /*select1_change_handler*/ ctx[23].call(select1));
    			add_location(select1, file$2, 161, 5, 4670);
    			attr_dev(div4, "class", "form-group");
    			add_location(div4, file$2, 159, 4, 4587);
    			attr_dev(label2, "for", "examTypeFilter");
    			add_location(label2, file$2, 170, 5, 4919);
    			option2.__value = "";
    			option2.value = option2.__value;
    			add_location(option2, file$2, 172, 6, 5037);
    			attr_dev(select2, "id", "examTypeFilter");
    			if (/*selectedExamType*/ ctx[3] === void 0) add_render_callback(() => /*select2_change_handler*/ ctx[24].call(select2));
    			add_location(select2, file$2, 171, 5, 4971);
    			attr_dev(div5, "class", "form-group");
    			add_location(div5, file$2, 169, 4, 4888);
    			attr_dev(label3, "for", "sortBy");
    			add_location(label3, file$2, 180, 5, 5232);
    			option3.__value = "newest";
    			option3.value = option3.__value;
    			add_location(option3, file$2, 182, 6, 5322);
    			option4.__value = "popular";
    			option4.value = option4.__value;
    			add_location(option4, file$2, 183, 6, 5374);
    			option5.__value = "price-low";
    			option5.value = option5.__value;
    			add_location(option5, file$2, 184, 6, 5427);
    			option6.__value = "price-high";
    			option6.value = option6.__value;
    			add_location(option6, file$2, 185, 6, 5488);
    			option7.__value = "subject";
    			option7.value = option7.__value;
    			add_location(option7, file$2, 186, 6, 5550);
    			attr_dev(select3, "id", "sortBy");
    			if (/*sortBy*/ ctx[4] === void 0) add_render_callback(() => /*select3_change_handler*/ ctx[25].call(select3));
    			add_location(select3, file$2, 181, 5, 5274);
    			attr_dev(div6, "class", "form-group");
    			add_location(div6, file$2, 179, 4, 5201);
    			attr_dev(div7, "class", "filters-grid svelte-n344dg");
    			add_location(div7, file$2, 148, 3, 4236);
    			add_location(span1, file$2, 193, 5, 5739);
    			attr_dev(button, "class", "btn btn-secondary");
    			add_location(button, file$2, 192, 4, 5674);
    			attr_dev(div8, "class", "filter-actions svelte-n344dg");
    			add_location(div8, file$2, 191, 3, 5640);
    			attr_dev(div9, "class", "search-filters svelte-n344dg");
    			add_location(div9, file$2, 135, 2, 3893);
    			attr_dev(h3, "class", "svelte-n344dg");
    			add_location(h3, file$2, 202, 4, 5904);
    			attr_dev(span2, "class", "count-number svelte-n344dg");
    			add_location(span2, file$2, 204, 5, 5968);
    			attr_dev(span3, "class", "count-label svelte-n344dg");
    			add_location(span3, file$2, 205, 5, 6031);
    			attr_dev(div10, "class", "results-count svelte-n344dg");
    			add_location(div10, file$2, 203, 4, 5934);
    			attr_dev(div11, "class", "results-header svelte-n344dg");
    			add_location(div11, file$2, 201, 3, 5870);
    			attr_dev(div12, "class", "results-section svelte-n344dg");
    			add_location(div12, file$2, 200, 2, 5836);
    			attr_dev(div13, "class", "card");
    			add_location(div13, file$2, 128, 1, 3675);
    			attr_dev(div14, "class", "browse-container svelte-n344dg");
    			add_location(div14, file$2, 127, 0, 3642);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div14, anchor);
    			append_dev(div14, div13);
    			append_dev(div13, div0);
    			append_dev(div0, h2);
    			append_dev(div0, t1);
    			append_dev(div0, p);
    			append_dev(div13, t3);
    			append_dev(div13, div9);
    			append_dev(div9, div2);
    			append_dev(div2, div1);
    			append_dev(div1, span0);
    			append_dev(div1, t5);
    			append_dev(div1, input);
    			set_input_value(input, /*searchTerm*/ ctx[0]);
    			append_dev(div9, t6);
    			append_dev(div9, div7);
    			append_dev(div7, div3);
    			append_dev(div3, label0);
    			append_dev(div3, t8);
    			append_dev(div3, select0);
    			append_dev(select0, option0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(select0, null);
    				}
    			}

    			select_option(select0, /*selectedSubject*/ ctx[1], true);
    			append_dev(div7, t10);
    			append_dev(div7, div4);
    			append_dev(div4, label1);
    			append_dev(div4, t12);
    			append_dev(div4, select1);
    			append_dev(select1, option1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(select1, null);
    				}
    			}

    			select_option(select1, /*selectedYear*/ ctx[2], true);
    			append_dev(div7, t14);
    			append_dev(div7, div5);
    			append_dev(div5, label2);
    			append_dev(div5, t16);
    			append_dev(div5, select2);
    			append_dev(select2, option2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select2, null);
    				}
    			}

    			select_option(select2, /*selectedExamType*/ ctx[3], true);
    			append_dev(div7, t18);
    			append_dev(div7, div6);
    			append_dev(div6, label3);
    			append_dev(div6, t20);
    			append_dev(div6, select3);
    			append_dev(select3, option3);
    			append_dev(select3, option4);
    			append_dev(select3, option5);
    			append_dev(select3, option6);
    			append_dev(select3, option7);
    			select_option(select3, /*sortBy*/ ctx[4], true);
    			append_dev(div9, t26);
    			append_dev(div9, div8);
    			append_dev(div8, button);
    			append_dev(button, span1);
    			append_dev(button, t28);
    			append_dev(div13, t29);
    			append_dev(div13, div12);
    			append_dev(div12, div11);
    			append_dev(div11, h3);
    			append_dev(div11, t31);
    			append_dev(div11, div10);
    			append_dev(div10, span2);
    			append_dev(span2, t32);
    			append_dev(div10, t33);
    			append_dev(div10, span3);
    			append_dev(div12, t35);
    			if_block0.m(div12, null);
    			append_dev(div14, t36);
    			if (if_block1) if_block1.m(div14, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[21]),
    					listen_dev(select0, "change", /*select0_change_handler*/ ctx[22]),
    					listen_dev(select1, "change", /*select1_change_handler*/ ctx[23]),
    					listen_dev(select2, "change", /*select2_change_handler*/ ctx[24]),
    					listen_dev(select3, "change", /*select3_change_handler*/ ctx[25]),
    					listen_dev(button, "click", /*clearFilters*/ ctx[16], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*searchTerm*/ 1 && input.value !== /*searchTerm*/ ctx[0]) {
    				set_input_value(input, /*searchTerm*/ ctx[0]);
    			}

    			if (dirty[0] & /*subjects*/ 4096) {
    				each_value_3 = /*subjects*/ ctx[12];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_3(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(select0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_3.length;
    			}

    			if (dirty[0] & /*selectedSubject, subjects*/ 4098) {
    				select_option(select0, /*selectedSubject*/ ctx[1]);
    			}

    			if (dirty[0] & /*years*/ 2048) {
    				each_value_2 = /*years*/ ctx[11];
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(select1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty[0] & /*selectedYear, years*/ 2052) {
    				select_option(select1, /*selectedYear*/ ctx[2]);
    			}

    			if (dirty[0] & /*examTypes*/ 1024) {
    				each_value_1 = /*examTypes*/ ctx[10];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty[0] & /*selectedExamType, examTypes*/ 1032) {
    				select_option(select2, /*selectedExamType*/ ctx[3]);
    			}

    			if (dirty[0] & /*sortBy*/ 16) {
    				select_option(select3, /*sortBy*/ ctx[4]);
    			}

    			if (dirty[0] & /*filteredFiles*/ 512 && t32_value !== (t32_value = /*filteredFiles*/ ctx[9].length + "")) set_data_dev(t32, t32_value);

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(div12, null);
    				}
    			}

    			if (/*showDownloadModal*/ ctx[5] && /*selectedFile*/ ctx[6]) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(div14, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div14);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getFileIcon(type) {
    	if (type.includes('pdf')) return '📄';
    	if (type.includes('word') || type.includes('document')) return '📝';
    	if (type.includes('image')) return '🖼️';
    	return '📁';
    }

    function formatFileSize(bytes) {
    	if (bytes === 0) return '0 Bytes';
    	const k = 1024;
    	const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    	const i = Math.floor(Math.log(bytes) / Math.log(k));
    	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function getRatingStars(rating) {
    	const stars = ('★').repeat(Math.floor(rating)) + ('☆').repeat(5 - Math.floor(rating));
    	return stars;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let subjects;
    	let years;
    	let examTypes;
    	let filteredFiles;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('BrowseComponent', slots, []);
    	const dispatch = createEventDispatcher();
    	let { availableFiles = [] } = $$props;
    	let { userCoins = 0 } = $$props;
    	let { onSpendCoins = null } = $$props;
    	let searchTerm = '';
    	let selectedSubject = '';
    	let selectedYear = '';
    	let selectedExamType = '';
    	let sortBy = 'newest';
    	let showDownloadModal = false;
    	let selectedFile = null;
    	let downloading = false;
    	let downloadProgress = 0;

    	function openDownloadModal(file) {
    		// All files are now free to view and download
    		$$invalidate(6, selectedFile = file);

    		$$invalidate(5, showDownloadModal = true);
    	}

    	async function confirmDownload() {
    		if (!selectedFile) return;
    		$$invalidate(7, downloading = true);
    		$$invalidate(8, downloadProgress = 0);

    		// Simulate download progress
    		const interval = setInterval(
    			() => {
    				$$invalidate(8, downloadProgress += Math.random() * 30);

    				if (downloadProgress >= 100) {
    					$$invalidate(8, downloadProgress = 100);
    					clearInterval(interval);

    					// All downloads are now free
    					setTimeout(
    						() => {
    							$$invalidate(7, downloading = false);
    							$$invalidate(5, showDownloadModal = false);
    							$$invalidate(6, selectedFile = null);
    							$$invalidate(8, downloadProgress = 0);

    							// Show success message
    							alert(`✅ Download completed! Enjoy your study material.`);
    						},
    						1000
    					);
    				}
    			},
    			200
    		);
    	}

    	function closeDownloadModal() {
    		if (!downloading) {
    			$$invalidate(5, showDownloadModal = false);
    			$$invalidate(6, selectedFile = null);
    			$$invalidate(8, downloadProgress = 0);
    		}
    	}

    	function clearFilters() {
    		$$invalidate(0, searchTerm = '');
    		$$invalidate(1, selectedSubject = '');
    		$$invalidate(2, selectedYear = '');
    		$$invalidate(3, selectedExamType = '');
    		$$invalidate(4, sortBy = 'newest');
    	}

    	const writable_props = ['availableFiles', 'userCoins', 'onSpendCoins'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<BrowseComponent> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input_input_handler() {
    		searchTerm = this.value;
    		$$invalidate(0, searchTerm);
    	}

    	function select0_change_handler() {
    		selectedSubject = select_value(this);
    		$$invalidate(1, selectedSubject);
    		($$invalidate(12, subjects), $$invalidate(17, availableFiles));
    	}

    	function select1_change_handler() {
    		selectedYear = select_value(this);
    		$$invalidate(2, selectedYear);
    		($$invalidate(11, years), $$invalidate(17, availableFiles));
    	}

    	function select2_change_handler() {
    		selectedExamType = select_value(this);
    		$$invalidate(3, selectedExamType);
    		($$invalidate(10, examTypes), $$invalidate(17, availableFiles));
    	}

    	function select3_change_handler() {
    		sortBy = select_value(this);
    		$$invalidate(4, sortBy);
    	}

    	const click_handler_1 = file => openDownloadModal(file);

    	$$self.$$set = $$props => {
    		if ('availableFiles' in $$props) $$invalidate(17, availableFiles = $$props.availableFiles);
    		if ('userCoins' in $$props) $$invalidate(18, userCoins = $$props.userCoins);
    		if ('onSpendCoins' in $$props) $$invalidate(19, onSpendCoins = $$props.onSpendCoins);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		availableFiles,
    		userCoins,
    		onSpendCoins,
    		searchTerm,
    		selectedSubject,
    		selectedYear,
    		selectedExamType,
    		sortBy,
    		showDownloadModal,
    		selectedFile,
    		downloading,
    		downloadProgress,
    		openDownloadModal,
    		confirmDownload,
    		closeDownloadModal,
    		clearFilters,
    		getFileIcon,
    		formatFileSize,
    		getRatingStars,
    		filteredFiles,
    		examTypes,
    		years,
    		subjects
    	});

    	$$self.$inject_state = $$props => {
    		if ('availableFiles' in $$props) $$invalidate(17, availableFiles = $$props.availableFiles);
    		if ('userCoins' in $$props) $$invalidate(18, userCoins = $$props.userCoins);
    		if ('onSpendCoins' in $$props) $$invalidate(19, onSpendCoins = $$props.onSpendCoins);
    		if ('searchTerm' in $$props) $$invalidate(0, searchTerm = $$props.searchTerm);
    		if ('selectedSubject' in $$props) $$invalidate(1, selectedSubject = $$props.selectedSubject);
    		if ('selectedYear' in $$props) $$invalidate(2, selectedYear = $$props.selectedYear);
    		if ('selectedExamType' in $$props) $$invalidate(3, selectedExamType = $$props.selectedExamType);
    		if ('sortBy' in $$props) $$invalidate(4, sortBy = $$props.sortBy);
    		if ('showDownloadModal' in $$props) $$invalidate(5, showDownloadModal = $$props.showDownloadModal);
    		if ('selectedFile' in $$props) $$invalidate(6, selectedFile = $$props.selectedFile);
    		if ('downloading' in $$props) $$invalidate(7, downloading = $$props.downloading);
    		if ('downloadProgress' in $$props) $$invalidate(8, downloadProgress = $$props.downloadProgress);
    		if ('filteredFiles' in $$props) $$invalidate(9, filteredFiles = $$props.filteredFiles);
    		if ('examTypes' in $$props) $$invalidate(10, examTypes = $$props.examTypes);
    		if ('years' in $$props) $$invalidate(11, years = $$props.years);
    		if ('subjects' in $$props) $$invalidate(12, subjects = $$props.subjects);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty[0] & /*availableFiles*/ 131072) {
    			// Get unique values for filters
    			$$invalidate(12, subjects = [...new Set(availableFiles.map(f => f.subject))].sort());
    		}

    		if ($$self.$$.dirty[0] & /*availableFiles*/ 131072) {
    			$$invalidate(11, years = [...new Set(availableFiles.map(f => f.year))].sort((a, b) => b - a));
    		}

    		if ($$self.$$.dirty[0] & /*availableFiles*/ 131072) {
    			$$invalidate(10, examTypes = [...new Set(availableFiles.map(f => f.examType))].sort());
    		}

    		if ($$self.$$.dirty[0] & /*availableFiles, searchTerm, selectedSubject, selectedYear, selectedExamType, sortBy*/ 131103) {
    			// Filter and sort files
    			$$invalidate(9, filteredFiles = availableFiles.filter(file => {
    				const matchesSearch = file.subject.toLowerCase().includes(searchTerm.toLowerCase()) || file.description.toLowerCase().includes(searchTerm.toLowerCase()) || file.name.toLowerCase().includes(searchTerm.toLowerCase());
    				const matchesSubject = !selectedSubject || file.subject === selectedSubject;
    				const matchesYear = !selectedYear || file.year === selectedYear;
    				const matchesExamType = !selectedExamType || file.examType === selectedExamType;
    				return matchesSearch && matchesSubject && matchesYear && matchesExamType;
    			}).sort((a, b) => {
    				switch (sortBy) {
    					case 'newest':
    						return new Date(b.uploadDate) - new Date(a.uploadDate);
    					case 'oldest':
    						return new Date(a.uploadDate) - new Date(b.uploadDate);
    					case 'price-low':
    						return a.price - b.price;
    					case 'price-high':
    						return b.price - a.price;
    					case 'subject':
    						return a.subject.localeCompare(b.subject);
    					case 'popular':
    						return (b.downloads || 0) - (a.downloads || 0);
    					default:
    						return 0;
    				}
    			}));
    		}
    	};

    	return [
    		searchTerm,
    		selectedSubject,
    		selectedYear,
    		selectedExamType,
    		sortBy,
    		showDownloadModal,
    		selectedFile,
    		downloading,
    		downloadProgress,
    		filteredFiles,
    		examTypes,
    		years,
    		subjects,
    		openDownloadModal,
    		confirmDownload,
    		closeDownloadModal,
    		clearFilters,
    		availableFiles,
    		userCoins,
    		onSpendCoins,
    		click_handler,
    		input_input_handler,
    		select0_change_handler,
    		select1_change_handler,
    		select2_change_handler,
    		select3_change_handler,
    		click_handler_1
    	];
    }

    class BrowseComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				availableFiles: 17,
    				userCoins: 18,
    				onSpendCoins: 19
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "BrowseComponent",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get availableFiles() {
    		throw new Error("<BrowseComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set availableFiles(value) {
    		throw new Error("<BrowseComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get userCoins() {
    		throw new Error("<BrowseComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userCoins(value) {
    		throw new Error("<BrowseComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onSpendCoins() {
    		throw new Error("<BrowseComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onSpendCoins(value) {
    		throw new Error("<BrowseComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\WalletComponent.svelte generated by Svelte v3.59.2 */

    const file$1 = "src\\components\\WalletComponent.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[22] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[25] = list[i];
    	return child_ctx;
    }

    // (136:2) {#if withdrawalSuccess}
    function create_if_block_4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "✅ Withdrawal successful! Your cash will be processed within 24 hours.";
    			attr_dev(div, "class", "success-message");
    			add_location(div, file$1, 136, 3, 3700);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(136:2) {#if withdrawalSuccess}",
    		ctx
    	});

    	return block;
    }

    // (155:4) {#if withdrawalAmount > 0}
    function create_if_block_3$1(ctx) {
    	let p;
    	let t0;
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("= ₦");
    			t1 = text(/*withdrawalAmount*/ ctx[2]);
    			attr_dev(p, "class", "cash-equivalent svelte-hvh1uy");
    			add_location(p, file$1, 155, 5, 4239);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*withdrawalAmount*/ 4) set_data_dev(t1, /*withdrawalAmount*/ ctx[2]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(155:4) {#if withdrawalAmount > 0}",
    		ctx
    	});

    	return block;
    }

    // (216:3) {:else}
    function create_else_block_1(ctx) {
    	let div2;
    	let h4;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let input;
    	let t4;
    	let div1;
    	let label1;
    	let t6;
    	let select;
    	let mounted;
    	let dispose;
    	let each_value_1 = /*providers*/ ctx[9];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Mobile Money Details";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Phone Number";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Provider";
    			t6 = space();
    			select = element("select");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h4, file$1, 217, 5, 5823);
    			attr_dev(label0, "for", "phoneNumber");
    			add_location(label0, file$1, 219, 6, 5891);
    			attr_dev(input, "id", "phoneNumber");
    			attr_dev(input, "type", "tel");
    			attr_dev(input, "placeholder", "e.g., 0241234567");
    			input.required = true;
    			add_location(input, file$1, 220, 6, 5944);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$1, 218, 5, 5859);
    			attr_dev(label1, "for", "provider");
    			add_location(label1, file$1, 229, 6, 6166);
    			attr_dev(select, "id", "provider");
    			if (/*mobileMoneyDetails*/ ctx[5].provider === void 0) add_render_callback(() => /*select_change_handler*/ ctx[21].call(select));
    			add_location(select, file$1, 230, 6, 6212);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$1, 228, 5, 6134);
    			attr_dev(div2, "class", "mobile-details svelte-hvh1uy");
    			add_location(div2, file$1, 216, 4, 5788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h4);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input);
    			set_input_value(input, /*mobileMoneyDetails*/ ctx[5].phoneNumber);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			append_dev(div1, select);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(select, null);
    				}
    			}

    			select_option(select, /*mobileMoneyDetails*/ ctx[5].provider, true);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[20]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[21])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*mobileMoneyDetails, providers*/ 544) {
    				set_input_value(input, /*mobileMoneyDetails*/ ctx[5].phoneNumber);
    			}

    			if (dirty & /*providers*/ 512) {
    				each_value_1 = /*providers*/ ctx[9];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(select, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}

    			if (dirty & /*mobileMoneyDetails, providers*/ 544) {
    				select_option(select, /*mobileMoneyDetails*/ ctx[5].provider);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(216:3) {:else}",
    		ctx
    	});

    	return block;
    }

    // (182:3) {#if withdrawalMethod === 'bank'}
    function create_if_block_2$1(ctx) {
    	let div3;
    	let h4;
    	let t1;
    	let div0;
    	let label0;
    	let t3;
    	let input0;
    	let t4;
    	let div1;
    	let label1;
    	let t6;
    	let input1;
    	let t7;
    	let div2;
    	let label2;
    	let t9;
    	let input2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			h4 = element("h4");
    			h4.textContent = "Bank Details";
    			t1 = space();
    			div0 = element("div");
    			label0 = element("label");
    			label0.textContent = "Account Number";
    			t3 = space();
    			input0 = element("input");
    			t4 = space();
    			div1 = element("div");
    			label1 = element("label");
    			label1.textContent = "Bank Name";
    			t6 = space();
    			input1 = element("input");
    			t7 = space();
    			div2 = element("div");
    			label2 = element("label");
    			label2.textContent = "Account Name";
    			t9 = space();
    			input2 = element("input");
    			add_location(h4, file$1, 183, 5, 4910);
    			attr_dev(label0, "for", "accountNumber");
    			add_location(label0, file$1, 185, 6, 4970);
    			attr_dev(input0, "id", "accountNumber");
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "placeholder", "Enter your account number");
    			input0.required = true;
    			add_location(input0, file$1, 186, 6, 5027);
    			attr_dev(div0, "class", "form-group");
    			add_location(div0, file$1, 184, 5, 4938);
    			attr_dev(label1, "for", "bankName");
    			add_location(label1, file$1, 195, 6, 5256);
    			attr_dev(input1, "id", "bankName");
    			attr_dev(input1, "type", "text");
    			attr_dev(input1, "placeholder", "e.g., Ghana Commercial Bank");
    			input1.required = true;
    			add_location(input1, file$1, 196, 6, 5303);
    			attr_dev(div1, "class", "form-group");
    			add_location(div1, file$1, 194, 5, 5224);
    			attr_dev(label2, "for", "accountName");
    			add_location(label2, file$1, 205, 6, 5524);
    			attr_dev(input2, "id", "accountName");
    			attr_dev(input2, "type", "text");
    			attr_dev(input2, "placeholder", "Full name on account");
    			input2.required = true;
    			add_location(input2, file$1, 206, 6, 5577);
    			attr_dev(div2, "class", "form-group");
    			add_location(div2, file$1, 204, 5, 5492);
    			attr_dev(div3, "class", "bank-details svelte-hvh1uy");
    			add_location(div3, file$1, 182, 4, 4877);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, h4);
    			append_dev(div3, t1);
    			append_dev(div3, div0);
    			append_dev(div0, label0);
    			append_dev(div0, t3);
    			append_dev(div0, input0);
    			set_input_value(input0, /*bankDetails*/ ctx[4].accountNumber);
    			append_dev(div3, t4);
    			append_dev(div3, div1);
    			append_dev(div1, label1);
    			append_dev(div1, t6);
    			append_dev(div1, input1);
    			set_input_value(input1, /*bankDetails*/ ctx[4].bankName);
    			append_dev(div3, t7);
    			append_dev(div3, div2);
    			append_dev(div2, label2);
    			append_dev(div2, t9);
    			append_dev(div2, input2);
    			set_input_value(input2, /*bankDetails*/ ctx[4].accountName);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler_1*/ ctx[17]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[18]),
    					listen_dev(input2, "input", /*input2_input_handler*/ ctx[19])
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*bankDetails*/ 16 && input0.value !== /*bankDetails*/ ctx[4].accountNumber) {
    				set_input_value(input0, /*bankDetails*/ ctx[4].accountNumber);
    			}

    			if (dirty & /*bankDetails*/ 16 && input1.value !== /*bankDetails*/ ctx[4].bankName) {
    				set_input_value(input1, /*bankDetails*/ ctx[4].bankName);
    			}

    			if (dirty & /*bankDetails*/ 16 && input2.value !== /*bankDetails*/ ctx[4].accountName) {
    				set_input_value(input2, /*bankDetails*/ ctx[4].accountName);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(182:3) {#if withdrawalMethod === 'bank'}",
    		ctx
    	});

    	return block;
    }

    // (232:7) {#each providers as provider}
    function create_each_block_1(ctx) {
    	let option;
    	let t_value = /*provider*/ ctx[25].toUpperCase() + "";
    	let t;

    	const block = {
    		c: function create() {
    			option = element("option");
    			t = text(t_value);
    			option.__value = /*provider*/ ctx[25];
    			option.value = option.__value;
    			add_location(option, file$1, 232, 8, 6323);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, option, anchor);
    			append_dev(option, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(option);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(232:7) {#each providers as provider}",
    		ctx
    	});

    	return block;
    }

    // (247:4) {:else}
    function create_else_block$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("💸 Request Withdrawal");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(247:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (245:4) {#if processingWithdrawal}
    function create_if_block_1$1(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("⏳ Processing...");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(245:4) {#if processingWithdrawal}",
    		ctx
    	});

    	return block;
    }

    // (255:1) {#if withdrawalHistory.length > 0}
    function create_if_block$1(ctx) {
    	let div1;
    	let h3;
    	let t1;
    	let div0;
    	let each_value = /*withdrawalHistory*/ ctx[6];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "📋 Withdrawal History";
    			t1 = space();
    			div0 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			add_location(h3, file$1, 256, 3, 6811);
    			attr_dev(div0, "class", "history-list svelte-hvh1uy");
    			add_location(div0, file$1, 257, 3, 6846);
    			attr_dev(div1, "class", "card");
    			add_location(div1, file$1, 255, 2, 6788);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, h3);
    			append_dev(div1, t1);
    			append_dev(div1, div0);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(div0, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*Date, withdrawalHistory*/ 64) {
    				each_value = /*withdrawalHistory*/ ctx[6];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div0, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(255:1) {#if withdrawalHistory.length > 0}",
    		ctx
    	});

    	return block;
    }

    // (259:4) {#each withdrawalHistory as withdrawal}
    function create_each_block(ctx) {
    	let div3;
    	let div2;
    	let div0;
    	let t0;
    	let t1_value = /*withdrawal*/ ctx[22].cashAmount + "";
    	let t1;
    	let t2;
    	let div1;
    	let p0;
    	let strong;

    	let t3_value = (/*withdrawal*/ ctx[22].method === 'bank'
    	? 'Bank Transfer'
    	: 'Mobile Money') + "";

    	let t3;
    	let t4;
    	let p1;
    	let t5_value = new Date(/*withdrawal*/ ctx[22].date).toLocaleDateString() + "";
    	let t5;
    	let t6;
    	let p2;
    	let t8;

    	const block = {
    		c: function create() {
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t0 = text("₦");
    			t1 = text(t1_value);
    			t2 = space();
    			div1 = element("div");
    			p0 = element("p");
    			strong = element("strong");
    			t3 = text(t3_value);
    			t4 = space();
    			p1 = element("p");
    			t5 = text(t5_value);
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "✅ Completed";
    			t8 = space();
    			attr_dev(div0, "class", "history-amount svelte-hvh1uy");
    			add_location(div0, file$1, 261, 7, 6993);
    			add_location(strong, file$1, 263, 11, 7102);
    			attr_dev(p0, "class", "svelte-hvh1uy");
    			add_location(p0, file$1, 263, 8, 7099);
    			attr_dev(p1, "class", "svelte-hvh1uy");
    			add_location(p1, file$1, 264, 8, 7198);
    			attr_dev(p2, "class", "status completed svelte-hvh1uy");
    			add_location(p2, file$1, 265, 8, 7263);
    			attr_dev(div1, "class", "history-details svelte-hvh1uy");
    			add_location(div1, file$1, 262, 7, 7060);
    			attr_dev(div2, "class", "history-info svelte-hvh1uy");
    			add_location(div2, file$1, 260, 6, 6958);
    			attr_dev(div3, "class", "history-item svelte-hvh1uy");
    			add_location(div3, file$1, 259, 5, 6924);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div3, anchor);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t0);
    			append_dev(div0, t1);
    			append_dev(div2, t2);
    			append_dev(div2, div1);
    			append_dev(div1, p0);
    			append_dev(p0, strong);
    			append_dev(strong, t3);
    			append_dev(div1, t4);
    			append_dev(div1, p1);
    			append_dev(p1, t5);
    			append_dev(div1, t6);
    			append_dev(div1, p2);
    			append_dev(div3, t8);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*withdrawalHistory*/ 64 && t1_value !== (t1_value = /*withdrawal*/ ctx[22].cashAmount + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*withdrawalHistory*/ 64 && t3_value !== (t3_value = (/*withdrawal*/ ctx[22].method === 'bank'
    			? 'Bank Transfer'
    			: 'Mobile Money') + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*withdrawalHistory*/ 64 && t5_value !== (t5_value = new Date(/*withdrawal*/ ctx[22].date).toLocaleDateString() + "")) set_data_dev(t5, t5_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div3);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(259:4) {#each withdrawalHistory as withdrawal}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div18;
    	let div13;
    	let h2;
    	let t1;
    	let div12;
    	let div2;
    	let div0;
    	let t2;
    	let t3;
    	let t4;
    	let div1;
    	let t6;
    	let div5;
    	let div3;
    	let t7_value = /*uploadedFiles*/ ctx[1].length + "";
    	let t7;
    	let t8;
    	let div4;
    	let t10;
    	let div8;
    	let div6;
    	let t13;
    	let div7;
    	let t15;
    	let div11;
    	let div9;
    	let t18;
    	let div10;
    	let t20;
    	let div17;
    	let h3;
    	let t22;
    	let t23;
    	let form;
    	let div14;
    	let label0;
    	let t25;
    	let input0;
    	let t26;
    	let small;
    	let t28;
    	let t29;
    	let div16;
    	let label1;
    	let t31;
    	let div15;
    	let label2;
    	let input1;
    	let t32;
    	let span0;
    	let t34;
    	let label3;
    	let input2;
    	let t35;
    	let span1;
    	let t37;
    	let t38;
    	let button;
    	let button_disabled_value;
    	let t39;
    	let binding_group;
    	let mounted;
    	let dispose;
    	let if_block0 = /*withdrawalSuccess*/ ctx[8] && create_if_block_4(ctx);
    	let if_block1 = /*withdrawalAmount*/ ctx[2] > 0 && create_if_block_3$1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*withdrawalMethod*/ ctx[3] === 'bank') return create_if_block_2$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type(ctx);

    	function select_block_type_1(ctx, dirty) {
    		if (/*processingWithdrawal*/ ctx[7]) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type_1 = select_block_type_1(ctx);
    	let if_block3 = current_block_type_1(ctx);
    	let if_block4 = /*withdrawalHistory*/ ctx[6].length > 0 && create_if_block$1(ctx);
    	binding_group = init_binding_group(/*$$binding_groups*/ ctx[15][0]);

    	const block = {
    		c: function create() {
    			div18 = element("div");
    			div13 = element("div");
    			h2 = element("h2");
    			h2.textContent = "💰 My Wallet";
    			t1 = space();
    			div12 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			t2 = text("₦");
    			t3 = text(/*userCoins*/ ctx[0]);
    			t4 = space();
    			div1 = element("div");
    			div1.textContent = "Available Balance";
    			t6 = space();
    			div5 = element("div");
    			div3 = element("div");
    			t7 = text(t7_value);
    			t8 = space();
    			div4 = element("div");
    			div4.textContent = "Files Uploaded";
    			t10 = space();
    			div8 = element("div");
    			div6 = element("div");
    			div6.textContent = `₦${/*getTotalEarnings*/ ctx[11]().toFixed(0)}`;
    			t13 = space();
    			div7 = element("div");
    			div7.textContent = "Total Earned";
    			t15 = space();
    			div11 = element("div");
    			div9 = element("div");
    			div9.textContent = `₦${/*getTotalWithdrawn*/ ctx[12]().toFixed(0)}`;
    			t18 = space();
    			div10 = element("div");
    			div10.textContent = "Total Withdrawn";
    			t20 = space();
    			div17 = element("div");
    			h3 = element("h3");
    			h3.textContent = "💸 Withdraw Cash";
    			t22 = space();
    			if (if_block0) if_block0.c();
    			t23 = space();
    			form = element("form");
    			div14 = element("div");
    			label0 = element("label");
    			label0.textContent = "Amount to Withdraw (Naira)";
    			t25 = space();
    			input0 = element("input");
    			t26 = space();
    			small = element("small");
    			small.textContent = "Minimum withdrawal: ₦100";
    			t28 = space();
    			if (if_block1) if_block1.c();
    			t29 = space();
    			div16 = element("div");
    			label1 = element("label");
    			label1.textContent = "Withdrawal Method";
    			t31 = space();
    			div15 = element("div");
    			label2 = element("label");
    			input1 = element("input");
    			t32 = space();
    			span0 = element("span");
    			span0.textContent = "🏦 Bank Transfer";
    			t34 = space();
    			label3 = element("label");
    			input2 = element("input");
    			t35 = space();
    			span1 = element("span");
    			span1.textContent = "📱 Mobile Money";
    			t37 = space();
    			if_block2.c();
    			t38 = space();
    			button = element("button");
    			if_block3.c();
    			t39 = space();
    			if (if_block4) if_block4.c();
    			add_location(h2, file$1, 109, 2, 2910);
    			attr_dev(div0, "class", "stat-value svelte-hvh1uy");
    			add_location(div0, file$1, 113, 4, 2999);
    			attr_dev(div1, "class", "stat-label svelte-hvh1uy");
    			add_location(div1, file$1, 114, 4, 3047);
    			attr_dev(div2, "class", "stat-card svelte-hvh1uy");
    			add_location(div2, file$1, 112, 3, 2970);
    			attr_dev(div3, "class", "stat-value svelte-hvh1uy");
    			add_location(div3, file$1, 117, 4, 3139);
    			attr_dev(div4, "class", "stat-label svelte-hvh1uy");
    			add_location(div4, file$1, 118, 4, 3197);
    			attr_dev(div5, "class", "stat-card svelte-hvh1uy");
    			add_location(div5, file$1, 116, 3, 3110);
    			attr_dev(div6, "class", "stat-value svelte-hvh1uy");
    			add_location(div6, file$1, 121, 4, 3286);
    			attr_dev(div7, "class", "stat-label svelte-hvh1uy");
    			add_location(div7, file$1, 122, 4, 3354);
    			attr_dev(div8, "class", "stat-card svelte-hvh1uy");
    			add_location(div8, file$1, 120, 3, 3257);
    			attr_dev(div9, "class", "stat-value svelte-hvh1uy");
    			add_location(div9, file$1, 125, 4, 3441);
    			attr_dev(div10, "class", "stat-label svelte-hvh1uy");
    			add_location(div10, file$1, 126, 4, 3510);
    			attr_dev(div11, "class", "stat-card svelte-hvh1uy");
    			add_location(div11, file$1, 124, 3, 3412);
    			attr_dev(div12, "class", "wallet-stats svelte-hvh1uy");
    			add_location(div12, file$1, 111, 2, 2939);
    			attr_dev(div13, "class", "card");
    			add_location(div13, file$1, 108, 1, 2888);
    			add_location(h3, file$1, 133, 2, 3639);
    			attr_dev(label0, "for", "withdrawalAmount");
    			add_location(label0, file$1, 143, 4, 3915);
    			attr_dev(input0, "id", "withdrawalAmount");
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "100");
    			attr_dev(input0, "max", /*userCoins*/ ctx[0]);
    			attr_dev(input0, "step", "100");
    			input0.required = true;
    			add_location(input0, file$1, 144, 4, 3985);
    			add_location(small, file$1, 153, 4, 4161);
    			attr_dev(div14, "class", "form-group");
    			add_location(div14, file$1, 142, 3, 3885);
    			add_location(label1, file$1, 160, 4, 4350);
    			attr_dev(input1, "type", "radio");
    			input1.__value = "bank";
    			input1.value = input1.__value;
    			attr_dev(input1, "class", "svelte-hvh1uy");
    			add_location(input1, file$1, 163, 6, 4461);
    			add_location(span0, file$1, 168, 6, 4568);
    			attr_dev(label2, "class", "method-option svelte-hvh1uy");
    			add_location(label2, file$1, 162, 5, 4424);
    			attr_dev(input2, "type", "radio");
    			input2.__value = "mobile";
    			input2.value = input2.__value;
    			attr_dev(input2, "class", "svelte-hvh1uy");
    			add_location(input2, file$1, 171, 6, 4656);
    			add_location(span1, file$1, 176, 6, 4765);
    			attr_dev(label3, "class", "method-option svelte-hvh1uy");
    			add_location(label3, file$1, 170, 5, 4619);
    			attr_dev(div15, "class", "method-selector svelte-hvh1uy");
    			add_location(div15, file$1, 161, 4, 4388);
    			attr_dev(div16, "class", "form-group");
    			add_location(div16, file$1, 159, 3, 4320);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "btn btn-success svelte-hvh1uy");
    			button.disabled = button_disabled_value = /*processingWithdrawal*/ ctx[7] || /*userCoins*/ ctx[0] < 100;
    			add_location(button, file$1, 239, 3, 6456);
    			add_location(form, file$1, 141, 2, 3830);
    			attr_dev(div17, "class", "card");
    			add_location(div17, file$1, 132, 1, 3617);
    			attr_dev(div18, "class", "wallet-container svelte-hvh1uy");
    			add_location(div18, file$1, 106, 0, 2828);
    			binding_group.p(input1, input2);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div18, anchor);
    			append_dev(div18, div13);
    			append_dev(div13, h2);
    			append_dev(div13, t1);
    			append_dev(div13, div12);
    			append_dev(div12, div2);
    			append_dev(div2, div0);
    			append_dev(div0, t2);
    			append_dev(div0, t3);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div12, t6);
    			append_dev(div12, div5);
    			append_dev(div5, div3);
    			append_dev(div3, t7);
    			append_dev(div5, t8);
    			append_dev(div5, div4);
    			append_dev(div12, t10);
    			append_dev(div12, div8);
    			append_dev(div8, div6);
    			append_dev(div8, t13);
    			append_dev(div8, div7);
    			append_dev(div12, t15);
    			append_dev(div12, div11);
    			append_dev(div11, div9);
    			append_dev(div11, t18);
    			append_dev(div11, div10);
    			append_dev(div18, t20);
    			append_dev(div18, div17);
    			append_dev(div17, h3);
    			append_dev(div17, t22);
    			if (if_block0) if_block0.m(div17, null);
    			append_dev(div17, t23);
    			append_dev(div17, form);
    			append_dev(form, div14);
    			append_dev(div14, label0);
    			append_dev(div14, t25);
    			append_dev(div14, input0);
    			set_input_value(input0, /*withdrawalAmount*/ ctx[2]);
    			append_dev(div14, t26);
    			append_dev(div14, small);
    			append_dev(div14, t28);
    			if (if_block1) if_block1.m(div14, null);
    			append_dev(form, t29);
    			append_dev(form, div16);
    			append_dev(div16, label1);
    			append_dev(div16, t31);
    			append_dev(div16, div15);
    			append_dev(div15, label2);
    			append_dev(label2, input1);
    			input1.checked = input1.__value === /*withdrawalMethod*/ ctx[3];
    			append_dev(label2, t32);
    			append_dev(label2, span0);
    			append_dev(div15, t34);
    			append_dev(div15, label3);
    			append_dev(label3, input2);
    			input2.checked = input2.__value === /*withdrawalMethod*/ ctx[3];
    			append_dev(label3, t35);
    			append_dev(label3, span1);
    			append_dev(form, t37);
    			if_block2.m(form, null);
    			append_dev(form, t38);
    			append_dev(form, button);
    			if_block3.m(button, null);
    			append_dev(div18, t39);
    			if (if_block4) if_block4.m(div18, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[13]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[14]),
    					listen_dev(input2, "change", /*input2_change_handler*/ ctx[16]),
    					listen_dev(form, "submit", prevent_default(/*handleWithdrawal*/ ctx[10]), false, true, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*userCoins*/ 1) set_data_dev(t3, /*userCoins*/ ctx[0]);
    			if (dirty & /*uploadedFiles*/ 2 && t7_value !== (t7_value = /*uploadedFiles*/ ctx[1].length + "")) set_data_dev(t7, t7_value);

    			if (/*withdrawalSuccess*/ ctx[8]) {
    				if (if_block0) ; else {
    					if_block0 = create_if_block_4(ctx);
    					if_block0.c();
    					if_block0.m(div17, t23);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*userCoins*/ 1) {
    				attr_dev(input0, "max", /*userCoins*/ ctx[0]);
    			}

    			if (dirty & /*withdrawalAmount*/ 4 && to_number(input0.value) !== /*withdrawalAmount*/ ctx[2]) {
    				set_input_value(input0, /*withdrawalAmount*/ ctx[2]);
    			}

    			if (/*withdrawalAmount*/ ctx[2] > 0) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(div14, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*withdrawalMethod*/ 8) {
    				input1.checked = input1.__value === /*withdrawalMethod*/ ctx[3];
    			}

    			if (dirty & /*withdrawalMethod*/ 8) {
    				input2.checked = input2.__value === /*withdrawalMethod*/ ctx[3];
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(form, t38);
    				}
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(ctx))) {
    				if_block3.d(1);
    				if_block3 = current_block_type_1(ctx);

    				if (if_block3) {
    					if_block3.c();
    					if_block3.m(button, null);
    				}
    			}

    			if (dirty & /*processingWithdrawal, userCoins*/ 129 && button_disabled_value !== (button_disabled_value = /*processingWithdrawal*/ ctx[7] || /*userCoins*/ ctx[0] < 100)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}

    			if (/*withdrawalHistory*/ ctx[6].length > 0) {
    				if (if_block4) {
    					if_block4.p(ctx, dirty);
    				} else {
    					if_block4 = create_if_block$1(ctx);
    					if_block4.c();
    					if_block4.m(div18, null);
    				}
    			} else if (if_block4) {
    				if_block4.d(1);
    				if_block4 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div18);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_block2.d();
    			if_block3.d();
    			if (if_block4) if_block4.d();
    			binding_group.r();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const exchangeRate = 100; // 100 coins = $1

    function calculateCashAmount(coins) {
    	return (coins / exchangeRate).toFixed(2);
    }

    function calculateCoinsFromCash(cash) {
    	return Math.floor(cash * exchangeRate);
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('WalletComponent', slots, []);
    	let { userCoins = 0 } = $$props;
    	let { uploadedFiles = [] } = $$props;
    	let withdrawalAmount = 0;
    	let withdrawalMethod = 'bank';

    	let bankDetails = {
    		accountNumber: '',
    		bankName: '',
    		accountName: ''
    	};

    	let mobileMoneyDetails = { phoneNumber: '', provider: 'mtn' };
    	let withdrawalHistory = [];
    	let processingWithdrawal = false;
    	let withdrawalSuccess = false;
    	const providers = ['mtn', 'airtel', 'vodafone', 'tigo'];

    	function handleWithdrawal() {
    		if (withdrawalAmount <= 0) {
    			alert('Please enter a valid withdrawal amount');
    			return;
    		}

    		if (withdrawalAmount > userCoins) {
    			alert(`You only have ${userCoins} coins available`);
    			return;
    		}

    		if (withdrawalMethod === 'bank') {
    			if (!bankDetails.accountNumber || !bankDetails.bankName || !bankDetails.accountName) {
    				alert('Please fill in all bank details');
    				return;
    			}
    		} else {
    			if (!mobileMoneyDetails.phoneNumber) {
    				alert('Please enter your phone number');
    				return;
    			}
    		}

    		calculateCashAmount(withdrawalAmount);

    		if (confirm(`Withdraw ₦${withdrawalAmount} to your ${withdrawalMethod === 'bank'
		? 'bank account'
		: 'mobile money'}?`)) {
    			$$invalidate(7, processingWithdrawal = true);

    			// Simulate processing
    			setTimeout(
    				() => {
    					const withdrawal = {
    						id: Date.now(),
    						amount: withdrawalAmount,
    						cashAmount: withdrawalAmount, // Same as amount since we're using Naira directly
    						method: withdrawalMethod,
    						details: withdrawalMethod === 'bank'
    						? bankDetails
    						: mobileMoneyDetails,
    						date: new Date().toISOString(),
    						status: 'completed'
    					};

    					withdrawalHistory.unshift(withdrawal);
    					localStorage.setItem('withdrawalHistory', JSON.stringify(withdrawalHistory));
    					$$invalidate(7, processingWithdrawal = false);
    					$$invalidate(8, withdrawalSuccess = true);

    					// Reset form
    					$$invalidate(2, withdrawalAmount = 0);

    					$$invalidate(4, bankDetails = {
    						accountNumber: '',
    						bankName: '',
    						accountName: ''
    					});

    					$$invalidate(5, mobileMoneyDetails = { phoneNumber: '', provider: 'mtn' });

    					// Hide success message after 3 seconds
    					setTimeout(
    						() => {
    							$$invalidate(8, withdrawalSuccess = false);
    						},
    						3000
    					);
    				},
    				2000
    			);
    		}
    	}

    	function getTotalEarnings() {
    		return uploadedFiles.reduce((total, file) => total + file.price, 0);
    	}

    	function getTotalWithdrawn() {
    		return withdrawalHistory.reduce((total, withdrawal) => total + withdrawal.cashAmount, 0);
    	}

    	const writable_props = ['userCoins', 'uploadedFiles'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<WalletComponent> was created with unknown prop '${key}'`);
    	});

    	const $$binding_groups = [[]];

    	function input0_input_handler() {
    		withdrawalAmount = to_number(this.value);
    		$$invalidate(2, withdrawalAmount);
    	}

    	function input1_change_handler() {
    		withdrawalMethod = this.__value;
    		$$invalidate(3, withdrawalMethod);
    	}

    	function input2_change_handler() {
    		withdrawalMethod = this.__value;
    		$$invalidate(3, withdrawalMethod);
    	}

    	function input0_input_handler_1() {
    		bankDetails.accountNumber = this.value;
    		$$invalidate(4, bankDetails);
    	}

    	function input1_input_handler() {
    		bankDetails.bankName = this.value;
    		$$invalidate(4, bankDetails);
    	}

    	function input2_input_handler() {
    		bankDetails.accountName = this.value;
    		$$invalidate(4, bankDetails);
    	}

    	function input_input_handler() {
    		mobileMoneyDetails.phoneNumber = this.value;
    		$$invalidate(5, mobileMoneyDetails);
    		$$invalidate(9, providers);
    	}

    	function select_change_handler() {
    		mobileMoneyDetails.provider = select_value(this);
    		$$invalidate(5, mobileMoneyDetails);
    		$$invalidate(9, providers);
    	}

    	$$self.$$set = $$props => {
    		if ('userCoins' in $$props) $$invalidate(0, userCoins = $$props.userCoins);
    		if ('uploadedFiles' in $$props) $$invalidate(1, uploadedFiles = $$props.uploadedFiles);
    	};

    	$$self.$capture_state = () => ({
    		userCoins,
    		uploadedFiles,
    		withdrawalAmount,
    		withdrawalMethod,
    		bankDetails,
    		mobileMoneyDetails,
    		withdrawalHistory,
    		processingWithdrawal,
    		withdrawalSuccess,
    		exchangeRate,
    		providers,
    		calculateCashAmount,
    		calculateCoinsFromCash,
    		handleWithdrawal,
    		getTotalEarnings,
    		getTotalWithdrawn
    	});

    	$$self.$inject_state = $$props => {
    		if ('userCoins' in $$props) $$invalidate(0, userCoins = $$props.userCoins);
    		if ('uploadedFiles' in $$props) $$invalidate(1, uploadedFiles = $$props.uploadedFiles);
    		if ('withdrawalAmount' in $$props) $$invalidate(2, withdrawalAmount = $$props.withdrawalAmount);
    		if ('withdrawalMethod' in $$props) $$invalidate(3, withdrawalMethod = $$props.withdrawalMethod);
    		if ('bankDetails' in $$props) $$invalidate(4, bankDetails = $$props.bankDetails);
    		if ('mobileMoneyDetails' in $$props) $$invalidate(5, mobileMoneyDetails = $$props.mobileMoneyDetails);
    		if ('withdrawalHistory' in $$props) $$invalidate(6, withdrawalHistory = $$props.withdrawalHistory);
    		if ('processingWithdrawal' in $$props) $$invalidate(7, processingWithdrawal = $$props.processingWithdrawal);
    		if ('withdrawalSuccess' in $$props) $$invalidate(8, withdrawalSuccess = $$props.withdrawalSuccess);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	{
    		const saved = localStorage.getItem('withdrawalHistory');

    		if (saved) {
    			$$invalidate(6, withdrawalHistory = JSON.parse(saved));
    		}
    	}

    	return [
    		userCoins,
    		uploadedFiles,
    		withdrawalAmount,
    		withdrawalMethod,
    		bankDetails,
    		mobileMoneyDetails,
    		withdrawalHistory,
    		processingWithdrawal,
    		withdrawalSuccess,
    		providers,
    		handleWithdrawal,
    		getTotalEarnings,
    		getTotalWithdrawn,
    		input0_input_handler,
    		input1_change_handler,
    		$$binding_groups,
    		input2_change_handler,
    		input0_input_handler_1,
    		input1_input_handler,
    		input2_input_handler,
    		input_input_handler,
    		select_change_handler
    	];
    }

    class WalletComponent extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { userCoins: 0, uploadedFiles: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "WalletComponent",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get userCoins() {
    		throw new Error("<WalletComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set userCoins(value) {
    		throw new Error("<WalletComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get uploadedFiles() {
    		throw new Error("<WalletComponent>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set uploadedFiles(value) {
    		throw new Error("<WalletComponent>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // API Service Layer - Easy to swap between localStorage and FastAPI

    class ApiService {
      constructor() {
        this.baseUrl = 'http://localhost:8000'; // FastAPI backend URL
        this.useLocalStorage = true; // Set to false when backend is ready
      }

      // User/Coin Management
      async getUserCoins() {
        if (this.useLocalStorage) {
          return parseInt(localStorage.getItem('userCoins') || '0');
        }
        // FastAPI call: GET /api/user/coins
        const response = await fetch(`${this.baseUrl}/api/user/coins`);
        return response.json();
      }

      async updateUserCoins(coins) {
        if (this.useLocalStorage) {
          localStorage.setItem('userCoins', coins.toString());
          return coins;
        }
        // FastAPI call: PUT /api/user/coins
        const response = await fetch(`${this.baseUrl}/api/user/coins`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coins })
        });
        return response.json();
      }

      // File Management
      async getUploadedFiles() {
        if (this.useLocalStorage) {
          return JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
        }
        // FastAPI call: GET /api/files/uploaded
        const response = await fetch(`${this.baseUrl}/api/files/uploaded`);
        return response.json();
      }

      async getAvailableFiles() {
        if (this.useLocalStorage) {
          return JSON.parse(localStorage.getItem('availableFiles') || '[]');
        }
        // FastAPI call: GET /api/files/available
        const response = await fetch(`${this.baseUrl}/api/files/available`);
        return response.json();
      }

      async uploadFile(fileData) {
        if (this.useLocalStorage) {
          const files = JSON.parse(localStorage.getItem('uploadedFiles') || '[]');
          files.push(fileData);
          localStorage.setItem('uploadedFiles', JSON.stringify(files));
          return fileData;
        }
        // FastAPI call: POST /api/files/upload
        const formData = new FormData();
        formData.append('file', fileData.file);
        formData.append('subject', fileData.subject);
        formData.append('year', fileData.year);
        formData.append('examType', fileData.examType);
        formData.append('description', fileData.description);
        formData.append('price', fileData.price);

        const response = await fetch(`${this.baseUrl}/api/files/upload`, {
          method: 'POST',
          body: formData
        });
        return response.json();
      }

      async downloadFile(fileId) {
        if (this.useLocalStorage) {
          // Simulate download
          return { success: true, message: 'Download started' };
        }
        // FastAPI call: GET /api/files/{fileId}/download
        const response = await fetch(`${this.baseUrl}/api/files/${fileId}/download`);
        return response.json();
      }

      // Withdrawal Management
      async getWithdrawalHistory() {
        if (this.useLocalStorage) {
          return JSON.parse(localStorage.getItem('withdrawalHistory') || '[]');
        }
        // FastAPI call: GET /api/withdrawals
        const response = await fetch(`${this.baseUrl}/api/withdrawals`);
        return response.json();
      }

      async requestWithdrawal(withdrawalData) {
        if (this.useLocalStorage) {
          const history = JSON.parse(localStorage.getItem('withdrawalHistory') || '[]');
          const withdrawal = {
            id: Date.now(),
            ...withdrawalData,
            date: new Date().toISOString(),
            status: 'completed'
          };
          history.unshift(withdrawal);
          localStorage.setItem('withdrawalHistory', JSON.stringify(history));
          return withdrawal;
        }
        // FastAPI call: POST /api/withdrawals
        const response = await fetch(`${this.baseUrl}/api/withdrawals`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(withdrawalData)
        });
        return response.json();
      }

      // Switch to backend mode
      enableBackend() {
        this.useLocalStorage = false;
      }

      // Switch back to localStorage mode
      enableLocalStorage() {
        this.useLocalStorage = true;
      }
    }

    var api = new ApiService();

    /* src\App.svelte generated by Svelte v3.59.2 */
    const file = "src\\App.svelte";

    // (219:0) {:else}
    function create_else_block(ctx) {
    	let main;
    	let navheader;
    	let t;
    	let div2;
    	let div1;
    	let div0;
    	let current_block_type_index;
    	let if_block;
    	let current;

    	navheader = new NavHeader({
    			props: {
    				user: /*user*/ ctx[1],
    				currentView: /*currentView*/ ctx[0]
    			},
    			$$inline: true
    		});

    	navheader.$on("viewChange", /*handleViewChange*/ ctx[8]);
    	navheader.$on("logout", /*handleLogout*/ ctx[7]);
    	navheader.$on("showAuth", /*handleShowAuth*/ ctx[9]);
    	const if_block_creators = [create_if_block_1, create_if_block_2, create_if_block_3];
    	const if_blocks = [];

    	function select_block_type_1(ctx, dirty) {
    		if (/*currentView*/ ctx[0] === 'browse') return 0;
    		if (/*currentView*/ ctx[0] === 'upload') return 1;
    		if (/*currentView*/ ctx[0] === 'wallet') return 2;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type_1(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(navheader.$$.fragment);
    			t = space();
    			div2 = element("div");
    			div1 = element("div");
    			div0 = element("div");
    			if (if_block) if_block.c();
    			attr_dev(div0, "class", "content-area slide-up svelte-l1rmoo");
    			add_location(div0, file, 230, 4, 5707);
    			attr_dev(div1, "class", "container svelte-l1rmoo");
    			add_location(div1, file, 229, 3, 5678);
    			attr_dev(div2, "class", "app-content svelte-l1rmoo");
    			add_location(div2, file, 228, 2, 5648);
    			attr_dev(main, "class", "svelte-l1rmoo");
    			add_location(main, file, 219, 1, 5483);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(navheader, main, null);
    			append_dev(main, t);
    			append_dev(main, div2);
    			append_dev(div2, div1);
    			append_dev(div1, div0);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div0, null);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const navheader_changes = {};
    			if (dirty & /*user*/ 2) navheader_changes.user = /*user*/ ctx[1];
    			if (dirty & /*currentView*/ 1) navheader_changes.currentView = /*currentView*/ ctx[0];
    			navheader.$set(navheader_changes);
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if (~current_block_type_index) {
    					if_blocks[current_block_type_index].p(ctx, dirty);
    				}
    			} else {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					} else {
    						if_block.p(ctx, dirty);
    					}

    					transition_in(if_block, 1);
    					if_block.m(div0, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navheader.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navheader.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(navheader);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(219:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (217:0) {#if showLandingPage}
    function create_if_block(ctx) {
    	let landingpage;
    	let current;
    	landingpage = new LandingPage({ $$inline: true });
    	landingpage.$on("userLogin", /*handleUserLogin*/ ctx[6]);

    	const block = {
    		c: function create() {
    			create_component(landingpage.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(landingpage, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(landingpage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(landingpage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(landingpage, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(217:0) {#if showLandingPage}",
    		ctx
    	});

    	return block;
    }

    // (245:40) 
    function create_if_block_3(ctx) {
    	let walletcomponent;
    	let current;

    	walletcomponent = new WalletComponent({
    			props: {
    				userCoins: /*userBalance*/ ctx[2],
    				uploadedFiles: /*uploadedFiles*/ ctx[3]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(walletcomponent.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(walletcomponent, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const walletcomponent_changes = {};
    			if (dirty & /*userBalance*/ 4) walletcomponent_changes.userCoins = /*userBalance*/ ctx[2];
    			if (dirty & /*uploadedFiles*/ 8) walletcomponent_changes.uploadedFiles = /*uploadedFiles*/ ctx[3];
    			walletcomponent.$set(walletcomponent_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(walletcomponent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(walletcomponent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(walletcomponent, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(245:40) ",
    		ctx
    	});

    	return block;
    }

    // (238:40) 
    function create_if_block_2(ctx) {
    	let uploadcomponent;
    	let current;

    	uploadcomponent = new UploadComponent({
    			props: {
    				uploadedFiles: /*uploadedFiles*/ ctx[3],
    				onAddCoins: /*addCoins*/ ctx[10],
    				onAddUploadedFile: /*addUploadedFile*/ ctx[12],
    				onAddAvailableFile: /*addAvailableFile*/ ctx[13]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(uploadcomponent.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(uploadcomponent, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const uploadcomponent_changes = {};
    			if (dirty & /*uploadedFiles*/ 8) uploadcomponent_changes.uploadedFiles = /*uploadedFiles*/ ctx[3];
    			uploadcomponent.$set(uploadcomponent_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(uploadcomponent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(uploadcomponent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(uploadcomponent, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(238:40) ",
    		ctx
    	});

    	return block;
    }

    // (232:5) {#if currentView === 'browse'}
    function create_if_block_1(ctx) {
    	let browsecomponent;
    	let current;

    	browsecomponent = new BrowseComponent({
    			props: {
    				availableFiles: /*availableFiles*/ ctx[4],
    				userCoins: /*userBalance*/ ctx[2],
    				onSpendCoins: /*spendCoins*/ ctx[11]
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(browsecomponent.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(browsecomponent, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const browsecomponent_changes = {};
    			if (dirty & /*availableFiles*/ 16) browsecomponent_changes.availableFiles = /*availableFiles*/ ctx[4];
    			if (dirty & /*userBalance*/ 4) browsecomponent_changes.userCoins = /*userBalance*/ ctx[2];
    			browsecomponent.$set(browsecomponent_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(browsecomponent.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(browsecomponent.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(browsecomponent, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(232:5) {#if currentView === 'browse'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let current_block_type_index;
    	let if_block;
    	let if_block_anchor;
    	let current;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*showLandingPage*/ ctx[5]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let { name = 'PQ Finder' } = $$props;
    	let currentView = 'browse';
    	let user = null;
    	let userBalance = 0;
    	let uploadedFiles = [];
    	let availableFiles = [];
    	let showLandingPage = true;

    	// Sample data to make the site look active
    	const sampleFiles = [
    		{
    			id: 1,
    			name: "Mathematics_2023_Final_Exam.pdf",
    			subject: "Mathematics",
    			year: 2023,
    			examType: "Final",
    			description: "Complete final exam with solutions and detailed explanations",
    			price: 150,
    			uploadDate: "2024-01-15T10:30:00Z",
    			size: 2048576,
    			type: "application/pdf",
    			downloads: 47,
    			rating: 4.8
    		},
    		{
    			id: 2,
    			name: "Physics_Midterm_2023_FREE.pdf",
    			subject: "Physics",
    			year: 2023,
    			examType: "Midterm",
    			description: "Physics midterm exam covering mechanics and thermodynamics - FREE SAMPLE",
    			price: 0,
    			uploadDate: "2024-01-14T14:20:00Z",
    			size: 1536000,
    			type: "application/pdf",
    			downloads: 89,
    			rating: 4.6,
    			isFree: true
    		},
    		{
    			id: 3,
    			name: "Chemistry_Quiz_Collection.pdf",
    			subject: "Chemistry",
    			year: 2023,
    			examType: "Quiz",
    			description: "Collection of 5 chemistry quizzes with answer keys",
    			price: 80,
    			uploadDate: "2024-01-13T09:15:00Z",
    			size: 1024000,
    			type: "application/pdf",
    			downloads: 28,
    			rating: 4.7
    		},
    		{
    			id: 4,
    			name: "Computer_Science_Sample_2023_FREE.pdf",
    			subject: "Computer Science",
    			year: 2023,
    			examType: "Final",
    			description: "Sample Computer Science questions - FREE PREVIEW",
    			price: 0,
    			uploadDate: "2024-01-12T16:45:00Z",
    			size: 1024000,
    			type: "application/pdf",
    			downloads: 156,
    			rating: 4.9,
    			isFree: true
    		},
    		{
    			id: 5,
    			name: "Economics_Assignment_2023.docx",
    			subject: "Economics",
    			year: 2023,
    			examType: "Assignment",
    			description: "Economics assignment with case studies and analysis",
    			price: 100,
    			uploadDate: "2024-01-11T11:30:00Z",
    			size: 512000,
    			type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    			downloads: 19,
    			rating: 4.5
    		},
    		{
    			id: 6,
    			name: "Biology_Lab_Report_FREE.pdf",
    			subject: "Biology",
    			year: 2023,
    			examType: "Assignment",
    			description: "Sample biology lab report with diagrams - FREE",
    			price: 0,
    			uploadDate: "2024-01-10T13:20:00Z",
    			size: 512000,
    			type: "application/pdf",
    			downloads: 67,
    			rating: 4.4,
    			isFree: true
    		},
    		{
    			id: 7,
    			name: "Mathematics_Quiz_Sample_FREE.pdf",
    			subject: "Mathematics",
    			year: 2023,
    			examType: "Quiz",
    			description: "Free sample mathematics quiz questions",
    			price: 0,
    			uploadDate: "2024-01-09T08:15:00Z",
    			size: 768000,
    			type: "application/pdf",
    			downloads: 124,
    			rating: 4.7,
    			isFree: true
    		},
    		{
    			id: 8,
    			name: "Engineering_Design_2023.pdf",
    			subject: "Engineering",
    			year: 2023,
    			examType: "Assignment",
    			description: "Engineering design project with detailed solutions",
    			price: 180,
    			uploadDate: "2024-01-08T15:30:00Z",
    			size: 2560000,
    			type: "application/pdf",
    			downloads: 23,
    			rating: 4.8
    		}
    	];

    	// Load data on mount
    	onMount(async () => {
    		// Check if user is already logged in
    		const savedUser = localStorage.getItem('user');

    		if (savedUser) {
    			$$invalidate(1, user = JSON.parse(savedUser));
    			$$invalidate(5, showLandingPage = false);
    		}

    		$$invalidate(2, userBalance = await api.getUserCoins());
    		$$invalidate(3, uploadedFiles = await api.getUploadedFiles());
    		$$invalidate(4, availableFiles = await api.getAvailableFiles());

    		// Add sample data if no files exist
    		if (availableFiles.length === 0) {
    			$$invalidate(4, availableFiles = sampleFiles);
    			localStorage.setItem('availableFiles', JSON.stringify(availableFiles));
    		}
    	});

    	function switchView(view) {
    		$$invalidate(0, currentView = view);
    	}

    	function handleUserLogin(event) {
    		$$invalidate(1, user = event.detail);
    		$$invalidate(1, user.balance = userBalance, user);
    		$$invalidate(5, showLandingPage = false);
    		localStorage.setItem('user', JSON.stringify(user));
    	}

    	function handleLogout() {
    		$$invalidate(1, user = null);
    		$$invalidate(5, showLandingPage = true);
    		localStorage.removeItem('user');
    	}

    	function handleViewChange(event) {
    		$$invalidate(0, currentView = event.detail);
    	}

    	function handleShowAuth() {
    		$$invalidate(5, showLandingPage = true);
    	}

    	async function addCoins(amount) {
    		$$invalidate(2, userBalance += amount);

    		if (user) {
    			$$invalidate(1, user.balance = userBalance, user);
    			localStorage.setItem('user', JSON.stringify(user));
    		}

    		await api.updateUserCoins(userBalance);
    	}

    	async function spendCoins(amount) {
    		if (userBalance >= amount) {
    			$$invalidate(2, userBalance -= amount);

    			if (user) {
    				$$invalidate(1, user.balance = userBalance, user);
    				localStorage.setItem('user', JSON.stringify(user));
    			}

    			await api.updateUserCoins(userBalance);
    			return true;
    		}

    		return false;
    	}

    	async function addUploadedFile(file) {
    		uploadedFiles.push(file);
    	} // File will be saved via API service

    	async function addAvailableFile(file) {
    		availableFiles.push(file);
    	} // File will be saved via API service

    	const writable_props = ['name'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('name' in $$props) $$invalidate(14, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		LandingPage,
    		NavHeader,
    		UploadComponent,
    		BrowseComponent,
    		WalletComponent,
    		api,
    		name,
    		currentView,
    		user,
    		userBalance,
    		uploadedFiles,
    		availableFiles,
    		showLandingPage,
    		sampleFiles,
    		switchView,
    		handleUserLogin,
    		handleLogout,
    		handleViewChange,
    		handleShowAuth,
    		addCoins,
    		spendCoins,
    		addUploadedFile,
    		addAvailableFile
    	});

    	$$self.$inject_state = $$props => {
    		if ('name' in $$props) $$invalidate(14, name = $$props.name);
    		if ('currentView' in $$props) $$invalidate(0, currentView = $$props.currentView);
    		if ('user' in $$props) $$invalidate(1, user = $$props.user);
    		if ('userBalance' in $$props) $$invalidate(2, userBalance = $$props.userBalance);
    		if ('uploadedFiles' in $$props) $$invalidate(3, uploadedFiles = $$props.uploadedFiles);
    		if ('availableFiles' in $$props) $$invalidate(4, availableFiles = $$props.availableFiles);
    		if ('showLandingPage' in $$props) $$invalidate(5, showLandingPage = $$props.showLandingPage);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentView,
    		user,
    		userBalance,
    		uploadedFiles,
    		availableFiles,
    		showLandingPage,
    		handleUserLogin,
    		handleLogout,
    		handleViewChange,
    		handleShowAuth,
    		addCoins,
    		spendCoins,
    		addUploadedFile,
    		addAvailableFile,
    		name
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, { name: 14 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}

    	get name() {
    		throw new Error("<App>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<App>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'PQ Finder'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
