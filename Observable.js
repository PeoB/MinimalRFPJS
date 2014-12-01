function Observable(subscribe) {
    this.subscribe = subscribe;
}

function AutoDisposingObservable(sub) {
    Observable.call(this, function (onNext) {
        var isDisposed = false;
        var dispose = function () {
            isDisposed = true;
        };

        function setDispose(d) {
            if (isDisposed)d();
            dispose = d;
            return d;
        }

        return setDispose(sub(function (value) {
            if (!isDisposed) {
                onNext(value);
            }
        }, ()=> dispose()));
    });
}
AutoDisposingObservable.prototype = Object.create(Observable.prototype);

Observable.listenFor = function (event, element) {
    return new Observable(function (next) {
        function callback(ev) {
            next(ev);
        }

        element.addEventListener(event, callback);
        return  () => element.removeEventListener(event, callback);
    });
};

Observable.interval = function (interval) {
    return new Observable(function (onNext) {
        var handle = setInterval(onNext, interval);
        return ()=> clearInterval(handle);
    });
};

Observable.prototype.map = function (mapper) {
    var that = this;
    return new Observable(
        function (onNext) {
            var index = 0;
            return that.subscribe(val=>onNext(mapper(val, index++)));
        });
};

Observable.prototype.filter = function (predicate) {
    var that = this;
    return new Observable(function (onNext) {
        return that.subscribe(function (val) {
            if (predicate(val))
                onNext(val);
        });
    });
};

Observable.prototype.zip = function (obs, joiner) {
    var sources = [this, obs];

    function enqueueFactory(queues, index, onNext) {
        return function (value) {
            queues[index].push(value);
            if (queues.every((q)=>q.length > 0))
                onNext(joiner.apply(undefined, queues.map(q=>q.shift())));
        };
    }

    return new Observable(function (onNext) {
        var queues = sources.map(()=>[]);

        return sources.map((o, i)=>o.subscribe(enqueueFactory(queues, i, onNext)))
            .reduce((d, s) =>function () { d(); s(); });
    });
};

Observable.prototype.take = function (numToTake) {
    var that = this;
    return new AutoDisposingObservable(function (onNext, onComplete) {
        var taken = 0;
        return that.subscribe(function (next) {
            if (taken++ < numToTake) {
                onNext(next);
                if (taken === numToTake) onComplete();
            }
        });
    });
};