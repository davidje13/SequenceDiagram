# Sequence Diagram

A tool for creating sequence diagrams from a Domain-Specific Language.

This project includes a web page for editing the diagrams, but the core
logic is available as separate components which can be included in
other projects.

## Examples

### Simple Usage

```
title Labyrinth

Bowie -> Gremlin: You remind me of the babe
Gremlin -> Bowie: What babe?
Bowie -> Gremlin: The babe with the power
Gremlin -> Bowie: What power?
note right of Bowie, Gremlin: Most people get muddled here!
Bowie -> Gremlin: 'The power of voodoo'
Gremlin -> Bowie: "Who-do?"
Bowie -> Gremlin: You do!
Gremlin -> Bowie: Do what?
Bowie -> Gremlin: Remind me of the babe!

Bowie -> Audience: Sings
```

### Connection Types

```
title Connection Types

Foo -> Bar: Simple arrow
Foo --> Bar: Dotted arrow
Foo <- Bar: Reversed arrow
Foo <-- Bar: Reversed dotted arrow
Foo <-> Bar: Double arrow
Foo <--> Bar: Double dotted arrow

# An arrow with no label:
Foo -> Bar

# Arrows leaving on the left and right of the diagram
[ -> Foo: From the left
[ <- Foo: To the left
Foo -> ]: To the right
Foo <- ]: From the right
[ -> ]: Left to right!
# (etc.)
```

### Notes & State

```
title Note placements

note over Foo: Foo says something
note left of Foo: Stuff
note right of Bar: More stuff
note over Foo, Bar: Foo and Bar
note between Foo, Bar: Link

state over Foo: Foo is ponderous
```

### Logic

```
title At the bank

Person -> ATM: Request money
ATM -> Bank: Check funds
if fraud detected
  Bank -> Police: "Get 'em!"
  Police -> Person: "You're nicked"
else if sufficient funds
  ATM -> Bank: Withdraw funds
  repeat until all requested money handed over
    ATM -> Person: Dispense note
  end
else
  ATM -> Person: Error
end
```

### Short-Lived Agents

```
title "Baz doesn't live long"

Foo -> Bar
begin Baz
Bar -> Baz
Baz -> Foo
end Baz
Foo -> Bar

# Foo and Bar end with black bars
terminators bar
# (options are: box, bar, cross, none)
```

### Alternative Agent Ordering

```
define Baz, Foo
Foo -> Bar
Bar -> Baz
```

## DSL Basics

Comments begin with a `#` and end at the next newline:

```
# This is a comment
```

Meta data can be provided with particular keywords:

```
title 'My title here'
```

Quoting strings is usually optional, for example these are the same:

```
title 'My title here'
title "My title here"
title My title here
title "My title" here
title "My" 'title' "here"
```

Each non-metadata line represents a step in the sequence, in order.

```
# Draw an arrow from agent "Foo Bar" to agent "Zig Zag" with a label:
# (implicitly creates the agents if they do not already exist)

Foo Bar -> Zig Zag: Do a thing

# With quotes, this is the same as:

'Foo Bar' -> 'Zig Zag': 'Do a thing'
```

Blocks surround steps, and can nest:

```
if something
  Foo -> Bar
else if something else
  Foo -> Baz
  if more stuff
    Baz -> Zig
  end
end
```

(indentation is ignored)

## Contributing

Contributions are welcome!

If you find a bug or desire a new feature, feel free to report it in
the GitHub issue tracker, or write the code yourself and make a pull
request.

Pull requests are more likely to be accepted if the code you changed
is tested (write new tests for new features and bug fixes, and update
existing tests where necessary). You can make sure the tests and linter
are passing by opening test.htm

Note: the linter can't run from the local filesystem, so you'll need to
run a local HTTP server to ensure linting is successful. One option if
you have NPM installed is:

```
# Setup
npm install http-server -g;

# Then
http-server;
```
