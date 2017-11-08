# Sequence Diagram

A tool for creating sequence diagrams from a Domain-Specific Language.

[See it in action!](https://davidje13.github.io/SequenceDiagram/)

This project includes a web page for editing the diagrams, but the core
logic is available as separate components which can be included in
other projects.

## Examples

### Simple Usage

<img src="screenshots/SimpleUsage.png" alt="Simple Usage preview" width="200" align="right" />

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

terminators box
```

### Connection Types

<img src="screenshots/ConnectionTypes.png" alt="Connection Types preview" width="200" align="right" />

```
title Connection Types

begin Foo, Bar, Baz

Foo -> Bar: Simple arrow
Bar --> Baz: Dashed arrow
Foo <- Bar: Reversed arrow
Bar <-- Baz: Reversed & dashed
Foo <-> Bar: Double arrow
Bar <--> Baz: Double dashed arrow

# An arrow with no label:
Foo -> Bar

Bar ->> Baz: Different arrow
Foo <<--> Bar: Mix of arrows

Bar -> Bar: Bar talks to itself

Foo -> +Bar: Foo asks Bar
-Bar --> Foo: and Bar replies

# Arrows leaving on the left and right of the diagram
[ -> Foo: From the left
[ <- Foo: To the left
Foo -> ]: To the right
Foo <- ]: From the right
[ -> ]: Left to right!
# (etc.)
```

### Notes & State

<img src="screenshots/NotesAndState.png" alt="Notes and State preview" width="200" align="right" />

```
title Note Placements

note over Foo: Foo says something
note left of Foo: Stuff
note right of Bar: More stuff
note over Foo, Bar: "Foo and Bar
on multiple lines"
note between Foo, Bar: Link

text right: 'Comments\nOver here!'

state over Foo: Foo is ponderous
```

### Logic

<img src="screenshots/Logic.png" alt="Logic preview" width="200" align="right" />

```
title At the Bank

begin Person, ATM, Bank
Person -> ATM: Request money
ATM -> Bank: Check funds
if fraud detected
  Bank -> Police: "Get 'em!"
  Police -> Person: "You're nicked"
  end Police
else if sufficient funds
  ATM -> Bank: Withdraw funds
  repeat until "all requested money
                has been handed over"
    ATM -> Person: Dispense note
  end
else
  ATM -> Person: Error
end
```

### Multiline Text

<img src="screenshots/MultilineText.png" alt="Multiline Text preview" width="200" align="right" />

```
title 'My Multiline
Title'

note over Foo: 'Also possible\nwith escapes'

Foo -> Bar: 'Lines of text\non this arrow'

if 'Even multiline\ninside conditions like this'
  Foo -> 'Multiline\nagent'
end

state over Foo: 'Newlines here,
too!'
```

### Short-Lived Agents

<img src="screenshots/ShortLivedAgents.png" alt="Short Lived Agents preview" width="200" align="right" />

```
title "Baz doesn't live long"

note over Foo, Bar: Using begin / end

begin Baz
Bar -> Baz
Baz -> Foo
end Baz

note over Foo, Bar: Using * / !

# * and ! cause agents to be created and destroyed inline
Bar -> *Baz: make Baz
Foo <- !Baz: end Baz

# Foo and Bar end with black bars
terminators bar
# (options are: box, bar, cross, fade, none)
```

### Agent Aliases

<img src="screenshots/AgentAliases.png" alt="Agent Aliases preview" width="200" align="right" />

```
define My complicated agent name as A
define "Another agent name,
and this one's multi-line!" as B

A -> B: this is much easier
A <- B: than writing the whole name
```

### Alternative Agent Ordering

<img src="screenshots/AlternativeAgentOrdering.png" alt="Alternative Agent Ordering preview" width="200" align="right" />

```
define Baz, Foo

Foo -> Bar
Bar -> Baz
```

### Simultaneous Actions (Beta!)

This is a work-in-progress feature. There are situations where this can
lead to [ugly / unreadable overlapping content](https://github.com/davidje13/SequenceDiagram/issues/13).

<img src="screenshots/SimultaneousActions.png" alt="Simultaneous Actions preview" width="200" align="right" />

```
begin A, B, C, D
A -> C

# Define a marker which can be returned to later

some primary process:
A -> B
B -> A
A -> B
B -> A

# Return to the defined marker
# (should be interpreted as no-higher-then the marker; may be
# pushed down to keep relative action ordering consistent)

simultaneously with some primary process:
C -> D
D -> C
end D
C -> A

# The marker name is optional; using "simultaneously:" with no
# marker will jump to the top of the entire sequence.
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
the [GitHub issue tracker](https://github.com/davidje13/SequenceDiagram/issues),
or write the code yourself and make a pull request.

Pull requests are more likely to be accepted if the code you changed
is tested (write new tests for new features and bug fixes, and update
existing tests where necessary). You can make sure the tests and linter
are passing by opening test.htm

Note: the linter can't run from the local filesystem, so you'll need to
run a local HTTP server to ensure linting is successful. One option if
you have NPM installed is:

```shell
# Setup
npm install http-server -g;

# Then
http-server;
```

The current status of the tests on the master branch can be checked at
[test.htm](https://davidje13.github.io/SequenceDiagram/test.htm)
