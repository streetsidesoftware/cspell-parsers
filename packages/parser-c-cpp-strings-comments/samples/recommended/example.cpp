#include <string>

// A tiny class showing the recommended settings also cover C++ raw strings.
class Greeter {
public:
    /**
     * Greets a visitor by name, falling back to a generic greeting.
     */
    std::string greet(const std::string &name) const {
        const std::string fallback = "friend";
        return "Hello, " + (name.empty() ? fallback : name) + "!";
    }

    std::string pattern() const { return R"(C:\path\to\file)"; }
};
